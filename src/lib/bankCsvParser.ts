import Papa from "papaparse";
import {
  buildHashDescription,
  computeTransactionHash,
  extractAccountHintFromRecord
} from "./transaction-hash";

export type NormalizedTxnType = "credit" | "debit";

export type NormalizedCsvTransaction = {
  txnDate: string;
  amount: string;
  currency: string;
  type: NormalizedTxnType;
  description?: string;
  merchant?: string;
  reference?: string;
  account?: string;
  externalId?: string;
  rowHash: string;
  raw: Record<string, string>;
};

export type CsvRejectedRow = {
  rowNumber: number;
  reason: string;
  raw: Record<string, string>;
};

export type BankCsvParserResult = {
  headers: string[];
  totalRows: number;
  transactions: NormalizedCsvTransaction[];
  rejectedRows: CsvRejectedRow[];
};

export type BankCsvParserOptions = {
  defaultCurrency?: string;
  strictHeaders?: boolean;
};

type ColumnMap = {
  date?: string;
  amount?: string;
  debit?: string;
  credit?: string;
  type?: string;
  description?: string;
  merchant?: string;
  reference?: string;
  account?: string;
  currency?: string;
  externalId?: string;
};

const HEADER_ALIASES = {
  date: [
    "date",
    "txn date",
    "transaction date",
    "value date",
    "posted date",
    "posting date",
    "book date"
  ],
  amount: ["amount", "txn amount", "transaction amount", "value"],
  debit: ["debit", "withdrawal", "outflow", "dr", "amount debited"],
  credit: ["credit", "deposit", "inflow", "cr", "amount credited"],
  type: ["type", "transaction type", "dr/cr", "debit/credit"],
  description: ["description", "narration", "particulars", "details", "remarks", "remark"],
  merchant: ["merchant", "counterparty", "payee", "beneficiary", "vendor"],
  reference: [
    "reference",
    "ref",
    "transaction id",
    "txn id",
    "utr",
    "rrn",
    "cheque no",
    "check no"
  ],
  account: [
    "account",
    "account no",
    "account number",
    "a/c no",
    "a/c number",
    "bank account",
    "source account"
  ],
  currency: ["currency", "ccy"],
  externalId: ["external id", "externalid", "line id", "statement line id", "id"]
} as const;

function normalizeHeader(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeValue(input: unknown): string {
  if (typeof input !== "string") {
    if (input === null || input === undefined) {
      return "";
    }

    return String(input).trim();
  }

  return input.trim();
}

function findHeader(headers: string[], aliases: readonly string[]): string | undefined {
  const normalizedHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalizeHeader(header)
  }));

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const exact = normalizedHeaders.find((header) => header.normalized === normalizedAlias);
    if (exact) {
      return exact.raw;
    }
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const partial = normalizedHeaders.find((header) =>
      header.normalized.includes(normalizedAlias)
    );

    if (partial) {
      return partial.raw;
    }
  }

  return undefined;
}

function resolveColumns(headers: string[]): ColumnMap {
  return {
    date: findHeader(headers, HEADER_ALIASES.date),
    amount: findHeader(headers, HEADER_ALIASES.amount),
    debit: findHeader(headers, HEADER_ALIASES.debit),
    credit: findHeader(headers, HEADER_ALIASES.credit),
    type: findHeader(headers, HEADER_ALIASES.type),
    description: findHeader(headers, HEADER_ALIASES.description),
    merchant: findHeader(headers, HEADER_ALIASES.merchant),
    reference: findHeader(headers, HEADER_ALIASES.reference),
    account: findHeader(headers, HEADER_ALIASES.account),
    currency: findHeader(headers, HEADER_ALIASES.currency),
    externalId: findHeader(headers, HEADER_ALIASES.externalId)
  };
}

function parseDateToIso(value: string): string {
  const raw = normalizeValue(value);

  if (!raw) {
    throw new Error("missing date");
  }

  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) {
    return native.toISOString();
  }

  const slashOrDash = raw.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (slashOrDash) {
    const a = Number(slashOrDash[1]);
    const b = Number(slashOrDash[2]);
    const c = Number(slashOrDash[3]);

    let year: number;
    let month: number;
    let day: number;

    if (a > 31) {
      year = a;
      month = b;
      day = c;
    } else {
      day = a;
      month = b;
      year = c < 100 ? 2000 + c : c;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  throw new Error(`invalid date: ${raw}`);
}

function parseMoney(value: string): number {
  const raw = normalizeValue(value);
  if (!raw) {
    return 0;
  }

  const negativeByBrackets = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw
    .replace(/[,\s]/g, "")
    .replace(/[₹$€£]/g, "")
    .replace(/[()]/g, "");

  if (!cleaned) {
    return 0;
  }

  const numeric = Number(cleaned);
  if (Number.isNaN(numeric)) {
    throw new Error(`invalid amount: ${raw}`);
  }

  return negativeByBrackets ? -Math.abs(numeric) : numeric;
}

function deriveTypeFromCell(value: string): NormalizedTxnType | undefined {
  const normalized = normalizeHeader(value);

  if (!normalized) {
    return undefined;
  }

  if (
    normalized === "dr" ||
    normalized === "debit" ||
    normalized.includes("debit") ||
    normalized.includes("withdraw")
  ) {
    return "debit";
  }

  if (
    normalized === "cr" ||
    normalized === "credit" ||
    normalized.includes("credit") ||
    normalized.includes("deposit")
  ) {
    return "credit";
  }

  return undefined;
}

function deriveAmountAndType(
  row: Record<string, string>,
  columns: ColumnMap
): { amount: string; type: NormalizedTxnType } {
  const debitValue = columns.debit ? parseMoney(row[columns.debit] ?? "") : 0;
  const creditValue = columns.credit ? parseMoney(row[columns.credit] ?? "") : 0;
  const amountValue = columns.amount ? parseMoney(row[columns.amount] ?? "") : 0;
  const explicitType = columns.type ? deriveTypeFromCell(row[columns.type] ?? "") : undefined;

  if (debitValue > 0 && creditValue === 0) {
    return { amount: debitValue.toFixed(2), type: "debit" };
  }

  if (creditValue > 0 && debitValue === 0) {
    return { amount: creditValue.toFixed(2), type: "credit" };
  }

  if (debitValue > 0 && creditValue > 0) {
    throw new Error("both debit and credit are populated");
  }

  if (amountValue !== 0) {
    if (explicitType) {
      return { amount: Math.abs(amountValue).toFixed(2), type: explicitType };
    }

    return amountValue < 0
      ? { amount: Math.abs(amountValue).toFixed(2), type: "debit" }
      : { amount: amountValue.toFixed(2), type: "credit" };
  }

  throw new Error("no amount found");
}

function cleanString(value?: string): string | undefined {
  const cleaned = normalizeValue(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function parseBankCsv(
  csv: string,
  options: BankCsvParserOptions = {}
): BankCsvParserResult {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error at row ${first.row ?? "?"}: ${first.message}`);
  }

  const headers = parsed.meta.fields ?? [];
  const columns = resolveColumns(headers);
  const rejectedRows: CsvRejectedRow[] = [];
  const transactions: NormalizedCsvTransaction[] = [];

  if (!columns.date) {
    throw new Error("CSV must contain a date column");
  }

  const hasAmountShape = Boolean(columns.amount || columns.debit || columns.credit);
  if (!hasAmountShape) {
    throw new Error("CSV must contain amount, debit, or credit columns");
  }

  if (options.strictHeaders && !columns.type && !columns.amount && !columns.debit && !columns.credit) {
    throw new Error("Strict mode: unable to resolve amount/type columns");
  }

  parsed.data.forEach((rawRow, idx) => {
    const rowNumber = idx + 2;
    const row: Record<string, string> = {};

    for (const [key, value] of Object.entries(rawRow)) {
      row[key] = normalizeValue(value);
    }

    try {
      const txnDate = parseDateToIso(row[columns.date as string]);
      const { amount, type } = deriveAmountAndType(row, columns);
      const currency =
        cleanString(columns.currency ? row[columns.currency] : undefined)?.toUpperCase() ??
        options.defaultCurrency?.toUpperCase() ??
        "INR";

      if (currency.length !== 3) {
        throw new Error(`invalid currency: ${currency}`);
      }

      const description = cleanString(columns.description ? row[columns.description] : undefined);
      const merchant = cleanString(columns.merchant ? row[columns.merchant] : undefined);
      const reference = cleanString(columns.reference ? row[columns.reference] : undefined);
      const accountFromColumn = cleanString(columns.account ? row[columns.account] : undefined);
      const account =
        accountFromColumn ??
        cleanString(extractAccountHintFromRecord(row) ?? undefined);
      const externalId = cleanString(columns.externalId ? row[columns.externalId] : undefined);

      const rowHash = computeTransactionHash({
        date: txnDate,
        amount,
        description: buildHashDescription([description, merchant, reference]),
        account: account ?? null
      });

      transactions.push({
        txnDate,
        amount,
        currency,
        type,
        description,
        merchant,
        reference,
        account,
        externalId,
        rowHash,
        raw: row
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown parse error";
      rejectedRows.push({
        rowNumber,
        reason,
        raw: row
      });
    }
  });

  return {
    headers,
    totalRows: parsed.data.length,
    transactions,
    rejectedRows
  };
}
