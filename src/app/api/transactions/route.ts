import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  parseBooleanQuery,
  parsePagination,
  toPositiveInt,
  readScopeFromBody,
  readScopeFromSearchParams
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import {
  insertTransaction,
  type InsertTransactionInput
} from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set(["pending", "posted", "reversed"]);
const ALLOWED_SOURCES = new Set([
  "bank",
  "upi",
  "razorpay",
  "stripe",
  "hdfc",
  "icici",
  "gpay",
  "tally",
  "whatsapp",
  "zohobooks",
  "manual",
  "csv_import",
  "csv_proof",
  "reversal",
  "import"
]);
const ALLOWED_PRESETS = new Set(["unmatched", "itc_mismatch", "gst_due"]);
const ALLOWED_RECON = new Set(["all", "unmatched", "needs_review"]);
const ALLOWED_SCHEMAS = new Set(["full", "standard"]);

type TransactionListRow = {
  id: number;
  public_id: string;
  workspace_id: string;
  business_id: number;
  occurred_at: string;
  description: string | null;
  counterparty: string | null;
  external_ref: string | null;
  direction: "credit" | "debit";
  status: "pending" | "posted" | "reversed";
  amount: string;
  currency_code: string;
  source: string;
  category_id: number | null;
  category_name: string | null;
  category_type: string | null;
  gst_applicable: boolean;
  gst_rate: string | null;
  gst_amount: string | null;
  matched: boolean;
  match_group_id: string | null;
  confidence: string | null;
  metadata: Record<string, unknown>;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

type StandardTransactionRow = {
  id: number;
  workspace_id: string;
  date: string;
  description: string | null;
  amount: string;
  type: "credit" | "debit";
  category: string | null;
  source: string;
  created_at: string;
};

type CountRow = {
  total: string;
};

type SqlValue = string | number | string[] | number[] | null;

type CursorPointer = {
  occurredAt: string;
  id: number;
};

type ParsedFiltersPayload = Record<string, unknown> | null;

function normalizeCsvParam(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseTransactionIdsCsv(value: string | null): number[] {
  if (!value) {
    return [];
  }

  const ids = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => Number.parseInt(entry, 10));

  if (ids.length === 0) {
    return [];
  }

  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("ids must be a comma-separated list of positive integers");
  }

  if (ids.length > 500) {
    throw new Error("ids cannot contain more than 500 transaction ids");
  }

  return [...new Set(ids)];
}

function normalizeUnknownList(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return normalizeCsvParam(value);
  }

  return [];
}

function readStringFilter(
  params: URLSearchParams,
  filters: ParsedFiltersPayload,
  key: string
): string {
  const direct = params.get(key);
  if (direct !== null) {
    return direct.trim();
  }

  if (!filters) {
    return "";
  }

  const value = filters[key];
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return "";
}

function readBooleanFilter(
  params: URLSearchParams,
  filters: ParsedFiltersPayload,
  key: string
): boolean | undefined {
  const direct = params.get(key);
  if (direct !== null) {
    return parseBooleanQuery(direct);
  }

  if (!filters) {
    return undefined;
  }

  const value = filters[key];
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
  }

  return undefined;
}

function readListFilter(
  params: URLSearchParams,
  filters: ParsedFiltersPayload,
  key: string
): string[] {
  const direct = params.get(key);
  if (direct !== null) {
    return normalizeCsvParam(direct);
  }

  if (!filters) {
    return [];
  }

  return normalizeUnknownList(filters[key]);
}

function parseTransactionIds(value: unknown): number[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return parseTransactionIdsCsv(value);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .map((entry) => Number.parseInt(String(entry), 10))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (ids.length > 500) {
    throw new Error("ids cannot contain more than 500 transaction ids");
  }

  return [...new Set(ids)];
}

function parseFiltersPayload(raw: string | null): ParsedFiltersPayload {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("filters must be a JSON object");
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("filters must be valid JSON");
  }
}

function toOptionalBusinessId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return toPositiveInt(value, "businessId");
}

function parseCursor(cursorRaw: string | null): CursorPointer | null {
  if (!cursorRaw) {
    return null;
  }

  const decoded = decodeURIComponent(cursorRaw);
  const [occurredAtRaw, idRaw] = decoded.split("|", 2);
  if (!occurredAtRaw || !idRaw) {
    throw new Error("cursor must be in format <isoDate>|<id>");
  }

  if (Number.isNaN(Date.parse(occurredAtRaw))) {
    throw new Error("cursor date is invalid");
  }

  const id = Number.parseInt(idRaw, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("cursor id is invalid");
  }

  return {
    occurredAt: occurredAtRaw,
    id
  };
}

function encodeCursor(row: TransactionListRow): string {
  return `${new Date(row.occurred_at).toISOString()}|${row.id}`;
}

function toStandardTransaction(row: TransactionListRow): StandardTransactionRow {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    date: row.occurred_at,
    description: row.description,
    amount: row.amount,
    type: row.direction,
    category: row.category_name,
    source: row.source,
    created_at: row.created_at
  };
}

function parseLimitFromRequest(params: {
  searchParams: URLSearchParams;
  filters: ParsedFiltersPayload;
}): number | null {
  const direct = params.searchParams.get("limit");
  if (direct !== null) {
    return toPositiveInt(direct, "limit");
  }

  const rawLimit = params.filters?.limit;
  if (rawLimit === undefined || rawLimit === null || rawLimit === "") {
    return null;
  }

  return toPositiveInt(rawLimit, "limit");
}

function buildTransactionQueryState(input: {
  workspaceId: string;
  includeDeleted: boolean;
  from: string;
  to: string;
  q: string;
  category: string;
  statusFilter: string[];
  sourceFilter: string[];
  transactionIds: number[];
  preset: string;
  recon: string;
}): { whereClause: string; values: SqlValue[]; index: number } {
  const filters: string[] = ["t.workspace_id = $1::uuid"];
  const values: SqlValue[] = [input.workspaceId];
  let index = 2;

  if (!input.includeDeleted) {
    filters.push("t.is_hidden = FALSE");
  }

  if (input.from) {
    values.push(input.from);
    filters.push(`t.occurred_at >= $${index}::timestamptz`);
    index += 1;
  }

  if (input.to) {
    values.push(input.to);
    filters.push(`t.occurred_at < ($${index}::date + INTERVAL '1 day')`);
    index += 1;
  }

  if (input.q) {
    values.push(`%${input.q}%`);
    filters.push(
      `(COALESCE(t.description, '') ILIKE $${index} OR COALESCE(t.counterparty, '') ILIKE $${index} OR COALESCE(t.external_ref, '') ILIKE $${index})`
    );
    index += 1;
  }

  if (input.statusFilter.length > 0) {
    values.push(input.statusFilter);
    filters.push(`t.status::text = ANY($${index}::text[])`);
    index += 1;
  }

  if (input.sourceFilter.length > 0) {
    values.push(input.sourceFilter);
    filters.push(`t.source = ANY($${index}::text[])`);
    index += 1;
  }

  if (input.category) {
    if (/^\d+$/.test(input.category)) {
      values.push(Number(input.category));
      filters.push(`t.category_id = $${index}`);
    } else {
      values.push(`%${input.category}%`);
      filters.push(`COALESCE(c.name, '') ILIKE $${index}`);
    }

    index += 1;
  }

  if (input.transactionIds.length > 0) {
    values.push(input.transactionIds);
    filters.push(`t.id = ANY($${index}::bigint[])`);
    index += 1;
  }

  if (input.preset === "unmatched") {
    filters.push("t.matched = FALSE");
  }

  if (input.preset === "gst_due") {
    filters.push("t.gst_applicable = TRUE");
  }

  if (input.preset === "itc_mismatch") {
    filters.push(`
      EXISTS (
        SELECT 1
        FROM alerts a
        WHERE a.workspace_id = t.workspace_id
          AND a.type = 'itc_mismatch'
          AND a.status = 'open'
          AND (
            a.transaction_id = t.id
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(COALESCE(a.related_transaction_ids, '[]'::jsonb)) related(value)
              WHERE related.value::bigint = t.id
            )
          )
      )
    `);
  }

  if (input.recon === "unmatched") {
    filters.push("t.matched = FALSE");
  }

  if (input.recon === "needs_review") {
    filters.push("t.matched = FALSE");
    filters.push("t.confidence IS NOT NULL");
    filters.push("t.confidence >= 0.60");
    filters.push("t.confidence < 0.95");
  }

  return {
    whereClause: `WHERE ${filters.join(" AND ")}`,
    values,
    index
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Body must be a JSON object");
  }

  try {
    const payload = body as Record<string, unknown>;
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });

    const created = await insertTransaction({
      ...(payload as InsertTransactionInput),
      businessId: scope.businessId
    });
    return NextResponse.json({ transaction: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to insert transaction";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Invalid") ||
      message.includes("Cannot") ||
      message.includes("violates") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const filtersPayload = parseFiltersPayload(params.get("filters"));
    const scopeFromQuery = readScopeFromSearchParams(params);
    const scopeInput = {
      workspaceId:
        scopeFromQuery.workspaceId ??
        (typeof filtersPayload?.workspaceId === "string" ? filtersPayload.workspaceId : undefined),
      businessId: scopeFromQuery.businessId ?? toOptionalBusinessId(filtersPayload?.businessId)
    };
    const scope = await resolveAuthorizedScope({
      request,
      scope: scopeInput
    });
    const useCursorMode = params.has("cursor") || params.has("filters");
    const includeDeleted = readBooleanFilter(params, filtersPayload, "includeDeleted") ?? false;
    const from = readStringFilter(params, filtersPayload, "from");
    const to = readStringFilter(params, filtersPayload, "to");
    const q = readStringFilter(params, filtersPayload, "q");
    const category = readStringFilter(params, filtersPayload, "category");
    const preset = readStringFilter(params, filtersPayload, "preset").toLowerCase();
    const recon = (readStringFilter(params, filtersPayload, "recon") || "all").toLowerCase();
    const schema = (params.get("schema") ?? "full").trim().toLowerCase();
    const transactionIds = parseTransactionIds(
      params.get("ids") ?? filtersPayload?.ids ?? filtersPayload?.transactionIds
    );
    const statusFilter = readListFilter(params, filtersPayload, "status");
    const sourceFilter = readListFilter(params, filtersPayload, "source");

    if (from && Number.isNaN(Date.parse(from))) {
      return badRequest("from must be a valid date or ISO timestamp");
    }

    if (to && Number.isNaN(Date.parse(to))) {
      return badRequest("to must be a valid date or ISO timestamp");
    }

    if (statusFilter.some((status) => !ALLOWED_STATUS.has(status))) {
      return badRequest("status must only include: pending, posted, reversed");
    }

    if (sourceFilter.some((source) => !ALLOWED_SOURCES.has(source))) {
      return badRequest(
        "source must only include: bank, upi, razorpay, stripe, hdfc, icici, gpay, tally, whatsapp, zohobooks, manual, csv_import, csv_proof, reversal, import"
      );
    }

    if (preset && !ALLOWED_PRESETS.has(preset)) {
      return badRequest("preset must be one of: unmatched, itc_mismatch, gst_due");
    }

    if (!ALLOWED_RECON.has(recon)) {
      return badRequest("recon must be one of: all, unmatched, needs_review");
    }

    if (!ALLOWED_SCHEMAS.has(schema)) {
      return badRequest("schema must be one of: full, standard");
    }

    const queryState = buildTransactionQueryState({
      workspaceId: scope.workspaceId,
      includeDeleted,
      from,
      to,
      q,
      category,
      statusFilter,
      sourceFilter,
      transactionIds,
      preset,
      recon
    });
    const db = getDbPool();

    if (useCursorMode) {
      const limit = parseLimitFromRequest({
        searchParams: params,
        filters: filtersPayload
      }) ?? 50;
      if (limit > 200) {
        return badRequest("limit cannot be greater than 200");
      }

      const cursor = parseCursor(params.get("cursor"));
      const cursorFilters: string[] = [];
      const values: SqlValue[] = [...queryState.values];
      let index = queryState.index;

      if (cursor) {
        values.push(cursor.occurredAt, cursor.id);
        cursorFilters.push(
          `(t.occurred_at < $${index}::timestamptz OR (t.occurred_at = $${index}::timestamptz AND t.id < $${index + 1}::bigint))`
        );
        index += 2;
      }

      values.push(limit + 1);
      const cursorWhere =
        cursorFilters.length > 0
          ? `${queryState.whereClause} AND ${cursorFilters.join(" AND ")}`
          : queryState.whereClause;

      const rowsResult = await db.query<TransactionListRow>(
        `
        SELECT
          t.id,
          t.public_id,
          t.workspace_id::text,
          t.business_id,
          t.occurred_at,
          t.description,
          t.counterparty,
          t.external_ref,
          t.direction::text AS direction,
          t.status::text AS status,
          t.amount_minor::text AS amount,
          t.currency_code,
          t.source,
          t.category_id,
          c.name AS category_name,
          c.type AS category_type,
          t.gst_applicable,
          t.gst_rate::text,
          t.gst_amount::text,
          t.matched,
          t.match_group_id::text,
          t.confidence::text,
          t.metadata,
          t.is_hidden,
          t.created_at,
          t.updated_at
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        ${cursorWhere}
        ORDER BY t.occurred_at DESC, t.id DESC
        LIMIT $${index}
        `,
        values
      );

      const hasMore = rowsResult.rows.length > limit;
      const transactions = hasMore ? rowsResult.rows.slice(0, limit) : rowsResult.rows;
      const lastRow = transactions[transactions.length - 1];
      const nextCursor = hasMore && lastRow ? encodeCursor(lastRow) : null;
      const shapedTransactions =
        schema === "standard" ? transactions.map(toStandardTransaction) : transactions;

      return NextResponse.json({
        count: transactions.length,
        limit,
        hasMore,
        nextCursor,
        appliedPreset: preset || null,
        appliedRecon: recon,
        schema,
        transactions: shapedTransactions
      });
    }

    const { page, pageSize } = parsePagination(params);
    const offset = (page - 1) * pageSize;

    const countResult = await db.query<CountRow>(
      `
      SELECT COUNT(*)::text AS total
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      ${queryState.whereClause}
      `,
      queryState.values
    );

    const dataValues = [...queryState.values, pageSize, offset];
    const rowsResult = await db.query<TransactionListRow>(
      `
      SELECT
        t.id,
        t.public_id,
        t.workspace_id::text,
        t.business_id,
        t.occurred_at,
        t.description,
        t.counterparty,
        t.external_ref,
        t.direction::text AS direction,
        t.status::text AS status,
        t.amount_minor::text AS amount,
        t.currency_code,
        t.source,
        t.category_id,
        c.name AS category_name,
        c.type AS category_type,
        t.gst_applicable,
        t.gst_rate::text,
        t.gst_amount::text,
        t.matched,
        t.match_group_id::text,
        t.confidence::text,
        t.metadata,
        t.is_hidden,
        t.created_at,
        t.updated_at
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      ${queryState.whereClause}
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT $${queryState.index}
      OFFSET $${queryState.index + 1}
      `,
      dataValues
    );

    const total = Number(countResult.rows[0]?.total ?? "0");
    const shapedTransactions =
      schema === "standard" ? rowsResult.rows.map(toStandardTransaction) : rowsResult.rows;

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      count: rowsResult.rows.length,
      appliedPreset: preset || null,
      appliedRecon: recon,
      schema,
      transactions: shapedTransactions
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to query transactions";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const statusCode =
      message.includes("must be") ||
      message.includes("Boolean") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found") ||
      message.includes("ids ")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
