import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromSearchParams,
  toOptionalPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import { computeMonthlySummary } from "@/lib/monthly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ITC_ELIGIBLE_CATEGORY_HINTS = [
  "marketing",
  "saas",
  "software",
  "logistics",
  "shipping",
  "rent",
  "utilities",
  "fixed cost",
  "internet",
  "electricity",
  "office",
  "operations",
  "professional",
  "subscription",
  "tax"
] as const;

const ALLOWED_METRICS = new Set([
  "revenue",
  "expenses",
  "profitEstimate",
  "gstPayableEstimate"
] as const);

type SupportedMetric =
  | "revenue"
  | "expenses"
  | "profitEstimate"
  | "gstPayableEstimate";

type MonthWindow = {
  key: string;
  label: string;
  startIso: string;
  endIso: string;
};

type TransactionLineageRow = {
  id: string;
  public_id: string | null;
  occurred_at: string;
  description: string | null;
  counterparty: string | null;
  direction: "credit" | "debit";
  amount_minor: string;
  gst_amount: string | null;
  gst_rate: string | null;
  status: string;
  source: string;
  category_name: string | null;
  metadata: unknown;
};

type AuditLogRow = {
  id: string;
  actor_type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
};

type ComputedLineageRow = {
  id: number;
  publicId: string | null;
  occurredAt: string;
  description: string | null;
  counterparty: string | null;
  direction: "credit" | "debit";
  amountMinor: number;
  contribution: number;
  contributionComponent: "core" | "output_gst" | "eligible_itc";
  categoryName: string | null;
  source: string;
  status: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textContainsAnyHint(text: string, hints: readonly string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function isEligibleInputCategory(categoryName: string | null): boolean {
  const normalized = normalizeText(categoryName);
  if (!normalized) {
    return false;
  }

  return textContainsAnyHint(normalized, ITC_ELIGIBLE_CATEGORY_HINTS);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function readItcEligibility(metadata: unknown): boolean | undefined {
  const root = asRecord(metadata);
  if (!root) {
    return undefined;
  }

  const directCandidates = [
    root.gst_itc_eligible,
    root.itcEligible,
    root.gstItcEligible
  ];
  for (const candidate of directCandidates) {
    const parsed = readBoolean(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  const nestedCandidates = [root.gst, root.tax, root.claims];
  for (const candidate of nestedCandidates) {
    const record = asRecord(candidate);
    if (!record) {
      continue;
    }

    const nestedValues = [
      record.itcEligible,
      record.gstItcEligible,
      record.itc_eligible,
      record.inputCreditEligible
    ];

    for (const nestedValue of nestedValues) {
      const parsed = readBoolean(nestedValue);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

function resolveMonthWindow(monthRaw: string | null, now = new Date()): MonthWindow {
  if (!monthRaw) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
    return {
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: start.toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      }),
      startIso: start.toISOString(),
      endIso: end.toISOString()
    };
  }

  const normalized = monthRaw.trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    throw new Error("month must be in YYYY-MM format");
  }

  const [yearRaw, monthValueRaw] = normalized.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const monthValue = Number.parseInt(monthValueRaw, 10);

  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error("month year must be between 2000 and 3000");
  }

  if (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12) {
    throw new Error("month value must be between 01 and 12");
  }

  const start = new Date(Date.UTC(year, monthValue - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthValue, 1, 0, 0, 0));

  return {
    key: `${year}-${String(monthValue).padStart(2, "0")}`,
    label: start.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }),
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

function parseMetric(value: string | null): SupportedMetric {
  const candidate = (value ?? "").trim();
  if (candidate && ALLOWED_METRICS.has(candidate as SupportedMetric)) {
    return candidate as SupportedMetric;
  }

  throw new Error(
    "metric must be one of: revenue, expenses, profitEstimate, gstPayableEstimate"
  );
}

function parseLimit(value: string | null): number {
  if (!value || !value.trim()) {
    return 30;
  }

  const parsed = toOptionalPositiveInt(value, "limit");
  if (!parsed) {
    throw new Error("limit must be a positive integer");
  }

  if (parsed > 200) {
    throw new Error("limit must be between 1 and 200");
  }

  return parsed;
}

function gstAmountForRow(row: TransactionLineageRow): number {
  const explicit = toNumber(row.gst_amount);
  if (explicit > 0) {
    return explicit;
  }

  const rate = toNumber(row.gst_rate);
  if (rate <= 0) {
    return 0;
  }

  const base = Math.abs(toNumber(row.amount_minor));
  return (base * rate) / 100;
}

function mapMetricFormula(metric: SupportedMetric): string {
  if (metric === "revenue") {
    return "Revenue = sum(amount) where direction = credit, non-hidden, status != pending.";
  }

  if (metric === "expenses") {
    return "Expenses = sum(amount) where direction = debit, non-hidden, status != pending.";
  }

  if (metric === "profitEstimate") {
    return "Profit estimate = sum(credit amount) - sum(debit amount) for the period.";
  }

  return "GST payable estimate = output GST on credit rows - eligible ITC on debit rows.";
}

function computeLineageRows(params: {
  metric: SupportedMetric;
  rows: TransactionLineageRow[];
  limit: number;
}): { rows: ComputedLineageRow[]; totalContribution: number; totalCandidates: number } {
  const computed: ComputedLineageRow[] = [];

  for (const row of params.rows) {
    const id = Number.parseInt(row.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      continue;
    }

    const amountMinor = Math.abs(toNumber(row.amount_minor));
    if (amountMinor <= 0) {
      continue;
    }

    if (params.metric === "revenue") {
      if (row.direction !== "credit") {
        continue;
      }

      computed.push({
        id,
        publicId: row.public_id ?? null,
        occurredAt: row.occurred_at,
        description: row.description,
        counterparty: row.counterparty,
        direction: row.direction,
        amountMinor,
        contribution: amountMinor,
        contributionComponent: "core",
        categoryName: row.category_name,
        source: row.source,
        status: row.status
      });
      continue;
    }

    if (params.metric === "expenses") {
      if (row.direction !== "debit") {
        continue;
      }

      computed.push({
        id,
        publicId: row.public_id ?? null,
        occurredAt: row.occurred_at,
        description: row.description,
        counterparty: row.counterparty,
        direction: row.direction,
        amountMinor,
        contribution: amountMinor,
        contributionComponent: "core",
        categoryName: row.category_name,
        source: row.source,
        status: row.status
      });
      continue;
    }

    if (params.metric === "profitEstimate") {
      computed.push({
        id,
        publicId: row.public_id ?? null,
        occurredAt: row.occurred_at,
        description: row.description,
        counterparty: row.counterparty,
        direction: row.direction,
        amountMinor,
        contribution: row.direction === "credit" ? amountMinor : -amountMinor,
        contributionComponent: "core",
        categoryName: row.category_name,
        source: row.source,
        status: row.status
      });
      continue;
    }

    if (row.status !== "posted" && row.status !== "reversed") {
      continue;
    }

    const gstValue = gstAmountForRow(row);
    if (gstValue <= 0) {
      continue;
    }

    if (row.direction === "credit") {
      computed.push({
        id,
        publicId: row.public_id ?? null,
        occurredAt: row.occurred_at,
        description: row.description,
        counterparty: row.counterparty,
        direction: row.direction,
        amountMinor,
        contribution: gstValue,
        contributionComponent: "output_gst",
        categoryName: row.category_name,
        source: row.source,
        status: row.status
      });
      continue;
    }

    const explicitItcEligibility = readItcEligibility(row.metadata);
    const eligible =
      explicitItcEligibility === true ||
      (explicitItcEligibility === undefined && isEligibleInputCategory(row.category_name));

    if (!eligible) {
      continue;
    }

    computed.push({
      id,
      publicId: row.public_id ?? null,
      occurredAt: row.occurred_at,
      description: row.description,
      counterparty: row.counterparty,
      direction: row.direction,
      amountMinor,
      contribution: -gstValue,
      contributionComponent: "eligible_itc",
      categoryName: row.category_name,
      source: row.source,
      status: row.status
    });
  }

  computed.sort((left, right) => {
    const delta = Math.abs(right.contribution) - Math.abs(left.contribution);
    if (Math.abs(delta) > 0.0001) {
      return delta;
    }

    return Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
  });

  const totalContribution = computed.reduce(
    (accumulator, row) => accumulator + row.contribution,
    0
  );

  return {
    rows: computed.slice(0, params.limit),
    totalContribution,
    totalCandidates: computed.length
  };
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (
    message.includes("metric ") ||
    message.includes("month ") ||
    message.includes("limit ") ||
    message.includes("must be") ||
    message.includes("Provide at least one scope identifier") ||
    message.includes("not found")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(params)
    });
    const monthWindow = resolveMonthWindow(params.get("month"));
    const metric = parseMetric(params.get("metric"));
    const limit = parseLimit(params.get("limit"));
    const scanLimit = Math.min(5000, Math.max(limit * 12, 300));

    const summary = await computeMonthlySummary({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      month: monthWindow.key
    });

    const db = getDbPool();
    const rowsResult = await db.query<TransactionLineageRow>(
      `
      SELECT
        t.id::text,
        t.public_id,
        t.occurred_at::text,
        t.description,
        t.counterparty,
        t.direction::text,
        t.amount_minor::text,
        t.gst_amount::text,
        t.gst_rate::text,
        t.status::text,
        t.source,
        c.name AS category_name,
        t.metadata
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.workspace_id = $1::uuid
        AND t.is_hidden = FALSE
        AND t.occurred_at >= $2::timestamptz
        AND t.occurred_at < $3::timestamptz
        AND (
          ($4 = 'gstPayableEstimate' AND t.gst_applicable = TRUE AND t.status IN ('posted', 'reversed'))
          OR ($4 <> 'gstPayableEstimate' AND t.status <> 'pending')
        )
      ORDER BY t.occurred_at DESC, t.id DESC
      LIMIT $5
      `,
      [scope.workspaceId, monthWindow.startIso, monthWindow.endIso, metric, scanLimit]
    );

    const lineage = computeLineageRows({
      metric,
      rows: rowsResult.rows,
      limit
    });
    const lineageIds = lineage.rows.map((row) => String(row.id));

    let auditLogs: AuditLogRow[] = [];
    if (lineageIds.length > 0) {
      const logsResult = await db.query<AuditLogRow>(
        `
        SELECT
          al.id::text,
          al.actor_type,
          al.actor_id,
          al.entity_type,
          al.entity_id,
          al.action,
          al.created_at::text
        FROM audit_logs al
        WHERE (al.workspace_id = $1::uuid OR (al.workspace_id IS NULL AND al.business_id = $2))
          AND LOWER(al.entity_type) = 'transaction'
          AND al.entity_id = ANY($3::text[])
        ORDER BY al.created_at DESC, al.id DESC
        LIMIT $4
        `,
        [scope.workspaceId, scope.businessId, lineageIds, Math.min(200, limit * 6)]
      );
      auditLogs = logsResult.rows;
    }

    const metricValue =
      metric === "revenue"
        ? summary.metrics.revenue
        : metric === "expenses"
          ? summary.metrics.expenses
          : metric === "profitEstimate"
            ? summary.metrics.profitEstimate
            : summary.metrics.gstPayableEstimate;

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      month: summary.month,
      monthLabel: summary.monthLabel,
      metric,
      metricValue: round2(metricValue),
      formula: mapMetricFormula(metric),
      lineage: {
        count: lineage.rows.length,
        totalCandidates: lineage.totalCandidates,
        truncated: lineage.totalCandidates > lineage.rows.length,
        contributionTotal: round2(lineage.totalContribution),
        transactions: lineage.rows.map((row) => ({
          id: row.id,
          publicId: row.publicId,
          occurredAt: row.occurredAt,
          description: row.description,
          counterparty: row.counterparty,
          direction: row.direction,
          amountMinor: round2(row.amountMinor),
          contribution: round2(row.contribution),
          contributionComponent: row.contributionComponent,
          categoryName: row.categoryName,
          source: row.source,
          status: row.status
        }))
      },
      auditLogs: auditLogs.map((log) => ({
        id: Number.parseInt(log.id, 10) || 0,
        actorType: log.actor_type,
        actorId: log.actor_id,
        entityType: log.entity_type,
        entityId: log.entity_id,
        action: log.action,
        createdAt: log.created_at
      }))
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build report lineage";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
