import type { CanonicalTransaction } from "@/lib/connectors/types";

export type StandardTransaction = {
  id: null;
  workspace_id: string;
  date: string;
  description: string;
  amount: string;
  type: "credit" | "debit";
  category: string | null;
  source: string;
  created_at: string;
  counterparty: string;
  currency_code: string;
  external_id: string | null;
  gst_applicable: boolean;
  gst_rate: string | null;
  gst_amount: string | null;
  metadata: Record<string, unknown>;
};

function normalizeSource(source: string): string {
  const normalized = source.trim().toLowerCase();

  if (!normalized) {
    return "manual";
  }

  if (normalized === "hdfc" || normalized === "icici" || normalized === "gpay" || normalized === "upi") {
    return "bank";
  }

  if (normalized === "csv" || normalized === "bank_csv") {
    return "csv_import";
  }

  return normalized;
}

function normalizeIsoDate(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
    return new Date().toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeDirection(value: string | null | undefined): "credit" | "debit" {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "debit" ? "debit" : "credit";
}

function normalizeAmount(value: string | number | null | undefined): string {
  const parsed = typeof value === "number" ? value : Number(value ?? "");
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }

  return Math.abs(parsed).toFixed(2);
}

function normalizeCurrencyCode(value: string | null | undefined): string {
  const normalized = (value ?? "INR").trim().toUpperCase();
  if (normalized.length !== 3) {
    return "INR";
  }

  return normalized;
}

function normalizeText(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  return normalized || fallback;
}

function normalizeOptionalNumeric(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.abs(parsed).toFixed(2);
}

function normalizeOptionalRate(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.abs(parsed).toFixed(3);
}

function toSafeMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function normalizeCanonicalTransaction(params: {
  workspaceId: string;
  source: string;
  row: CanonicalTransaction;
  createdAt?: string | Date;
}): StandardTransaction {
  return {
    id: null,
    workspace_id: params.workspaceId,
    date: normalizeIsoDate(params.row.occurredAt),
    description: normalizeText(params.row.description, "Transaction"),
    amount: normalizeAmount(params.row.amount),
    type: normalizeDirection(params.row.direction),
    category: null,
    source: normalizeSource(params.source),
    created_at: normalizeIsoDate(params.createdAt),
    counterparty: normalizeText(params.row.counterparty, "Unknown"),
    currency_code: normalizeCurrencyCode(params.row.currencyCode),
    external_id: params.row.externalTxnId?.trim() || null,
    gst_applicable: Boolean(params.row.gstApplicable),
    gst_rate: normalizeOptionalRate(params.row.gstRate),
    gst_amount: normalizeOptionalNumeric(params.row.gstAmount),
    metadata: toSafeMetadata(params.row.metadata)
  };
}

export function normalizeCsvTransaction(params: {
  workspaceId: string;
  source: string;
  row: {
    txnDate: string;
    amount: string;
    type: "credit" | "debit";
    description?: string;
    merchant?: string;
    currency?: string;
    externalId?: string;
    raw?: Record<string, unknown>;
  };
  createdAt?: string | Date;
}): StandardTransaction {
  return {
    id: null,
    workspace_id: params.workspaceId,
    date: normalizeIsoDate(params.row.txnDate),
    description: normalizeText(params.row.description, "CSV transaction"),
    amount: normalizeAmount(params.row.amount),
    type: normalizeDirection(params.row.type),
    category: null,
    source: normalizeSource(params.source),
    created_at: normalizeIsoDate(params.createdAt),
    counterparty: normalizeText(params.row.merchant, "Unknown"),
    currency_code: normalizeCurrencyCode(params.row.currency),
    external_id: params.row.externalId?.trim() || null,
    gst_applicable: false,
    gst_rate: null,
    gst_amount: null,
    metadata: toSafeMetadata(params.row.raw)
  };
}
