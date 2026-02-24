import { Prisma, PrismaClient, TxnStatus, TxnType } from "@prisma/client";
import {
  parseBankCsv,
  type BankCsvParserOptions,
  type NormalizedCsvTransaction
} from "./bankCsvParser";
import {
  CATEGORIZE_V0_TARGET_RATE,
  CATEGORIZE_V0_VERSION,
  buildCategoryNameIdMap,
  categorizeTransactionV0,
  resolveCategoryIdByCategoryName
} from "./categorizeV0";
import { buildHashDescription } from "./transaction-hash";

export type InsertParsedTransactionsInput = {
  businessId: bigint | number | string;
  rows: NormalizedCsvTransaction[];
  prisma?: PrismaClient;
  source?: string;
  chunkSize?: number;
  dryRun?: boolean;
};

export type InsertParsedTransactionsResult = {
  businessId: string;
  inputCount: number;
  uniqueInPayloadCount: number;
  alreadyExistingCount: number;
  insertedCount: number;
  skippedCount: number;
  dryRun: boolean;
  duplicateRowHashes: string[];
  autoTaggedCount: number;
  autoTaggedRate: number;
  coverageTarget: number;
  coverageTargetMet: boolean;
  categorizationRulesVersion: string;
  duplicateSuggestionCount: number;
};

export type ParseAndInsertCsvInput = {
  businessId: bigint | number | string;
  csv: string;
  parserOptions?: BankCsvParserOptions;
  prisma?: PrismaClient;
  source?: string;
  chunkSize?: number;
  dryRun?: boolean;
};

export type ParseAndInsertCsvResult = {
  parsed: ReturnType<typeof parseBankCsv>;
  insert: InsertParsedTransactionsResult;
};

function toBigIntId(value: bigint | number | string, fieldName: string): bigint {
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${fieldName} must be a positive bigint`);
    }

    return value;
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} must be a positive integer`);
    }

    return BigInt(value);
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${fieldName} must be a positive integer string`);
  }

  const parsed = BigInt(trimmed);
  if (parsed <= 0n) {
    throw new Error(`${fieldName} must be a positive integer string`);
  }

  return parsed;
}

function normalizeChunkSize(chunkSize?: number): number {
  if (chunkSize === undefined) {
    return 500;
  }

  if (!Number.isInteger(chunkSize) || chunkSize <= 0 || chunkSize > 5_000) {
    throw new Error("chunkSize must be an integer between 1 and 5000");
  }

  return chunkSize;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  return chunks;
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized.length !== 3) {
    throw new Error(`Invalid currency code: ${value}`);
  }

  return normalized;
}

function normalizeTxnType(value: string): TxnType {
  if (value === "credit") {
    return TxnType.credit;
  }

  if (value === "debit") {
    return TxnType.debit;
  }

  throw new Error(`Invalid txn type: ${value}`);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildDuplicateFingerprint(rowHash: string, transactionIds: bigint[]): string {
  const sortedIds = [...transactionIds]
    .map((id) => id.toString())
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

  return `dup:${rowHash}:${sortedIds.join(",")}`;
}

async function createDuplicateImportSuggestions(params: {
  prisma: PrismaClient;
  businessId: bigint;
  workspaceId: string;
  candidateRowHashes: string[];
}): Promise<number> {
  if (params.candidateRowHashes.length === 0) {
    return 0;
  }

  const relatedRows = await params.prisma.transaction.findMany({
    where: {
      workspaceId: params.workspaceId,
      rowHash: { in: params.candidateRowHashes }
    },
    select: {
      id: true,
      rowHash: true
    }
  });

  if (relatedRows.length === 0) {
    return 0;
  }

  const idsByHash = new Map<string, bigint[]>();
  for (const row of relatedRows) {
    if (!row.rowHash) {
      continue;
    }

    const current = idsByHash.get(row.rowHash) ?? [];
    current.push(row.id);
    idsByHash.set(row.rowHash, current);
  }

  const existingFingerprintRows = await params.prisma.$queryRaw<Array<{ fingerprint: string | null }>>(
    Prisma.sql`
      SELECT payload->>'fingerprint' AS fingerprint
      FROM alerts
      WHERE workspace_id = ${params.workspaceId}::uuid
        AND type = 'duplicate'
        AND status IN ('open', 'snoozed')
    `
  );
  const existingFingerprints = new Set(
    existingFingerprintRows
      .map((row) => row.fingerprint)
      .filter((fingerprint): fingerprint is string => Boolean(fingerprint))
  );

  let created = 0;
  for (const rowHash of params.candidateRowHashes) {
    const relatedIds = idsByHash.get(rowHash) ?? [];
    if (relatedIds.length === 0) {
      continue;
    }

    const fingerprint = buildDuplicateFingerprint(rowHash, relatedIds);
    if (existingFingerprints.has(fingerprint)) {
      continue;
    }

    const sortedIds = [...relatedIds]
      .map((id) => Number.parseInt(id.toString(), 10))
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);

    await params.prisma.alert.create({
      data: {
        businessId: params.businessId,
        workspaceId: params.workspaceId,
        transactionId: relatedIds[0] ?? null,
        alertType: "duplicate",
        type: "duplicate",
        severity: "warning",
        status: "open",
        title: "Auto-clean suggestion: potential duplicate",
        body: `${sortedIds.length} transaction(s) share the same import hash. Action: Merge / Ignore.`,
        message: "Potential duplicate transaction detected from import hash.",
        relatedTransactionIds: sortedIds,
        payload: {
          source: "rules_engine_v0",
          fingerprint,
          hash: rowHash,
          suggestedAction: "merge",
          suggestedKeepTransactionId: sortedIds[0] ?? null
        }
      }
    });

    existingFingerprints.add(fingerprint);
    created += 1;
  }

  return created;
}

function buildCreateData(params: {
  businessId: bigint;
  row: NormalizedCsvTransaction;
  source: string;
  categoryId: bigint | null;
  categorizationMatch: {
    categoryName: string | null;
    confidence: number;
    matchedRule?: string;
    tags: string[];
  };
  autoTagged: boolean;
}) {
  const existingMetadata = isJsonObject(params.row.raw) ? (params.row.raw as Prisma.JsonObject) : {};

  return {
    businessId: params.businessId,
    categoryId: params.categoryId,
    amount: params.row.amount,
    currency: normalizeCurrency(params.row.currency),
    type: normalizeTxnType(params.row.type),
    status: TxnStatus.posted,
    txnDate: new Date(params.row.txnDate),
    description: params.row.description ?? null,
    merchant: params.row.merchant ?? null,
    reference: params.row.reference ?? null,
    externalId: params.row.externalId ?? null,
    rowHash: params.row.rowHash,
    source: params.source,
    metadata: {
      importer: "bankCsvParser",
      dedupe: {
        hash: params.row.rowHash,
        formula: "sha256(date|amount|normalized_desc|account)"
      },
      categorization: {
        version: CATEGORIZE_V0_VERSION,
        autoTagged: params.autoTagged,
        categoryName: params.categorizationMatch.categoryName,
        confidence: params.categorizationMatch.confidence,
        matchedRule: params.categorizationMatch.matchedRule ?? null,
        tags: params.categorizationMatch.tags
      },
      raw: existingMetadata,
      hashInputs: {
        description: buildHashDescription([
          params.row.description,
          params.row.merchant,
          params.row.reference
        ]),
        account: params.row.account ?? null
      }
    }
  };
}

export async function insertParsedTransactions(
  input: InsertParsedTransactionsInput
): Promise<InsertParsedTransactionsResult> {
  const businessId = toBigIntId(input.businessId, "businessId");
  const chunkSize = normalizeChunkSize(input.chunkSize);
  const source = (input.source ?? "csv_import").trim() || "csv_import";
  const dryRun = Boolean(input.dryRun);

  if (input.rows.length === 0) {
    return {
      businessId: businessId.toString(),
      inputCount: 0,
      uniqueInPayloadCount: 0,
      alreadyExistingCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      dryRun,
      duplicateRowHashes: [],
      autoTaggedCount: 0,
      autoTaggedRate: 0,
      coverageTarget: CATEGORIZE_V0_TARGET_RATE,
      coverageTargetMet: false,
      categorizationRulesVersion: CATEGORIZE_V0_VERSION,
      duplicateSuggestionCount: 0
    };
  }

  const rowHashSeen = new Set<string>();
  const duplicateRowHashes: string[] = [];
  const uniqueRows: NormalizedCsvTransaction[] = [];

  for (const row of input.rows) {
    if (!row.rowHash) {
      throw new Error("Each parsed row must include a rowHash");
    }

    if (rowHashSeen.has(row.rowHash)) {
      duplicateRowHashes.push(row.rowHash);
      continue;
    }

    rowHashSeen.add(row.rowHash);
    uniqueRows.push(row);
  }

  const prisma = input.prisma ?? new PrismaClient();
  const createdPrisma = !input.prisma;

  try {
    const uniqueHashes = uniqueRows.map((row) => row.rowHash);
    const workspace = await prisma.workspace.findUnique({
      where: { businessId },
      select: { id: true }
    });

    if (!workspace) {
      throw new Error(`Workspace not found for businessId=${businessId.toString()}`);
    }

    const categories = await prisma.category.findMany({
      where: {
        businessId,
        workspaceId: workspace.id
      },
      select: { id: true, name: true }
    });

    const categoryMap = buildCategoryNameIdMap(categories);

    const existingRows = await prisma.transaction.findMany({
      where: {
        workspaceId: workspace.id,
        rowHash: {
          in: uniqueHashes
        }
      },
      select: {
        rowHash: true
      }
    });

    const existingSet = new Set(
      existingRows.map((row) => row.rowHash).filter((value): value is string => Boolean(value))
    );

    const toInsert = uniqueRows.filter((row) => !existingSet.has(row.rowHash));
    const categorizedRows = toInsert.map((row) => {
      const match = categorizeTransactionV0({
        description: row.description ?? null,
        merchant: row.merchant ?? null,
        reference: row.reference ?? null
      });
      const categoryId = match.categoryName
        ? resolveCategoryIdByCategoryName({
            categoryName: match.categoryName,
            categoryMap
          })
        : null;

      return {
        row,
        match,
        categoryId,
        autoTagged: Boolean(categoryId)
      };
    });
    const autoTaggedCount = categorizedRows.filter((row) => row.autoTagged).length;
    const autoTaggedRate =
      categorizedRows.length === 0 ? 0 : autoTaggedCount / categorizedRows.length;
    const coverageTargetMet = autoTaggedRate >= CATEGORIZE_V0_TARGET_RATE;

    let duplicateSuggestionCount = 0;

    if (!dryRun) {
      if (toInsert.length > 0) {
        const batches = chunkArray(categorizedRows, chunkSize);
        for (const batch of batches) {
          await prisma.transaction.createMany({
            data: batch.map((entry) =>
              buildCreateData({
                businessId,
                row: entry.row,
                source,
                categoryId: entry.categoryId,
                categorizationMatch: entry.match,
                autoTagged: entry.autoTagged
              })
            )
          });
        }
      }

      const duplicateCandidateHashes = [
        ...new Set([...duplicateRowHashes, ...Array.from(existingSet)])
      ];
      duplicateSuggestionCount = await createDuplicateImportSuggestions({
        prisma,
        businessId,
        workspaceId: workspace.id,
        candidateRowHashes: duplicateCandidateHashes
      });
    }

    return {
      businessId: businessId.toString(),
      inputCount: input.rows.length,
      uniqueInPayloadCount: uniqueRows.length,
      alreadyExistingCount: existingSet.size,
      insertedCount: dryRun ? 0 : toInsert.length,
      skippedCount: existingSet.size + duplicateRowHashes.length,
      dryRun,
      duplicateRowHashes,
      autoTaggedCount,
      autoTaggedRate,
      coverageTarget: CATEGORIZE_V0_TARGET_RATE,
      coverageTargetMet,
      categorizationRulesVersion: CATEGORIZE_V0_VERSION,
      duplicateSuggestionCount
    };
  } finally {
    if (createdPrisma) {
      await prisma.$disconnect();
    }
  }
}

export async function parseAndInsertBankCsv(
  input: ParseAndInsertCsvInput
): Promise<ParseAndInsertCsvResult> {
  const parsed = parseBankCsv(input.csv, input.parserOptions);
  const insert = await insertParsedTransactions({
    businessId: input.businessId,
    rows: parsed.transactions,
    prisma: input.prisma,
    source: input.source,
    chunkSize: input.chunkSize,
    dryRun: input.dryRun
  });

  return {
    parsed,
    insert
  };
}
