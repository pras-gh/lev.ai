"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ErrorState,
  StatusPill,
  TimeRangePicker,
  type TimeRange
} from "@/components/design-system";
import { formatDateRangeLabel, formatInr } from "@/lib/formatters";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

type OverviewMetrics = {
  cash_balance: number;
  runway_days: number;
  revenue_mtd: number;
  expenses_mtd: number;
  gst_due_days: number;
  gst_est_payable: number;
  itc_mismatch_count: number;
  itc_mismatch_value: number;
  reconciliation_pct: number;
  anomaly_count: number;
  month_close_readiness_pct: number;
  compliance_confidence: number;
};

type HealthMetrics = {
  cash_runway_months: number;
  gst_due_amount_next_7d: number;
  itc_mismatch_count: number;
  recon_match_pct: number;
  month_close_readiness_pct: number;
  compliance_confidence: number;
};

type TransactionSummary = {
  total: number;
};

type ScopeBody = {
  workspaceId?: string;
  businessId?: number;
};

type ScopeDetails = {
  scopeQuery: string;
  scopeLabel: string;
  scopeBody: ScopeBody;
};

type LineageMetric =
  | "revenue"
  | "expenses"
  | "profitEstimate"
  | "gstPayableEstimate";

type MonthCloseResponse = {
  month: string;
  monthLabel: string;
  durationMs: number;
  stageDurations: {
    categorizeMs: number;
    reconcileMs: number;
    alertsMs: number;
    reportMs: number;
  };
  categorize: {
    tagged?: number;
    duplicateSuggestionsOpen?: number;
    coverage?: {
      ratio?: number;
    };
  };
  reconcile: {
    suggestions?: number;
    recon_match_pct?: number;
  };
  alerts: {
    statusCounts?: {
      opened?: number;
      updated?: number;
      resolved?: number;
      none?: number;
    };
  };
  report: {
    metrics?: {
      revenue?: number;
      expenses?: number;
      profitEstimate?: number;
      gstPayableEstimate?: number;
      safeToSpendCash?: number;
    };
  };
  verification?: {
    before?: {
      txTotal?: number;
      txCategorized?: number;
      txMatched?: number;
      openAlerts?: number;
    };
    after?: {
      txTotal?: number;
      txCategorized?: number;
      txMatched?: number;
      openAlerts?: number;
    };
    delta?: {
      txTotal?: number;
      txCategorized?: number;
      txMatched?: number;
      openAlerts?: number;
    };
    checks?: {
      apiRun?: boolean;
      dbTouched?: boolean;
      alertsEvaluated?: boolean;
      reportGenerated?: boolean;
    };
  };
};

type ReportLineageResponse = {
  month: string;
  monthLabel: string;
  metric: LineageMetric;
  metricValue: number;
  formula: string;
  lineage: {
    count: number;
    totalCandidates: number;
    truncated: boolean;
    contributionTotal: number;
    transactions: Array<{
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
    }>;
  };
  auditLogs: Array<{
    id: number;
    actorType: string;
    actorId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    createdAt: string;
  }>;
};

const FALLBACK_OVERVIEW: OverviewMetrics = {
  cash_balance: 0,
  runway_days: 0,
  revenue_mtd: 0,
  expenses_mtd: 0,
  gst_due_days: 0,
  gst_est_payable: 0,
  itc_mismatch_count: 0,
  itc_mismatch_value: 0,
  reconciliation_pct: 0,
  anomaly_count: 0,
  month_close_readiness_pct: 0,
  compliance_confidence: 0
};

const FALLBACK_HEALTH: HealthMetrics = {
  cash_runway_months: 0,
  gst_due_amount_next_7d: 0,
  itc_mismatch_count: 0,
  recon_match_pct: 0,
  month_close_readiness_pct: 0,
  compliance_confidence: 0
};

function parseErrorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") {
    return fallback;
  }

  const record = json as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function toScope(searchParams: URLSearchParams): ScopeDetails {
  const workspaceId = searchParams.get("workspaceId");
  const businessRaw = searchParams.get("businessId") ?? "1";
  const businessId = Number.parseInt(businessRaw, 10);
  const safeBusinessId = Number.isInteger(businessId) && businessId > 0 ? businessId : 1;

  if (workspaceId) {
    return {
      scopeQuery: `workspaceId=${encodeURIComponent(workspaceId)}`,
      scopeLabel: `Workspace ${workspaceId.slice(0, 8)}`,
      scopeBody: {
        workspaceId
      }
    };
  }

  return {
    scopeQuery: `businessId=${encodeURIComponent(String(safeBusinessId))}`,
    scopeLabel: `Business ${safeBusinessId}`,
    scopeBody: {
      businessId: safeBusinessId
    }
  };
}

async function fetchOverview(scopeQuery: string, range: TimeRange): Promise<OverviewMetrics> {
  const response = await fetchWithTimeout(`/api/metrics/overview?${scopeQuery}&range=${range}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load overview metrics"));
  }

  const json = (await response.json()) as Partial<OverviewMetrics>;

  return {
    cash_balance: toNumber(json.cash_balance),
    runway_days: toNumber(json.runway_days),
    revenue_mtd: toNumber(json.revenue_mtd),
    expenses_mtd: toNumber(json.expenses_mtd),
    gst_due_days: toNumber(json.gst_due_days),
    gst_est_payable: toNumber(json.gst_est_payable),
    itc_mismatch_count: toNumber(json.itc_mismatch_count),
    itc_mismatch_value: toNumber(json.itc_mismatch_value),
    reconciliation_pct: toNumber(json.reconciliation_pct),
    anomaly_count: toNumber(json.anomaly_count),
    month_close_readiness_pct: toNumber(json.month_close_readiness_pct),
    compliance_confidence: toNumber(json.compliance_confidence)
  };
}

async function fetchHealth(scopeQuery: string): Promise<HealthMetrics> {
  const response = await fetchWithTimeout(`/api/metrics/health?${scopeQuery}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load health metrics"));
  }

  const json = (await response.json()) as Partial<HealthMetrics>;

  return {
    cash_runway_months: toNumber(json.cash_runway_months),
    gst_due_amount_next_7d: toNumber(json.gst_due_amount_next_7d),
    itc_mismatch_count: toNumber(json.itc_mismatch_count),
    recon_match_pct: toNumber(json.recon_match_pct),
    month_close_readiness_pct: toNumber(json.month_close_readiness_pct),
    compliance_confidence: toNumber(json.compliance_confidence)
  };
}

async function fetchTransactionSummary(scopeQuery: string): Promise<TransactionSummary> {
  const response = await fetchWithTimeout(`/api/transactions?${scopeQuery}&page=1&limit=1`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load transaction summary"));
  }

  const json = (await response.json()) as { total?: number };
  return {
    total: Math.max(0, Math.trunc(toNumber(json.total)))
  };
}

async function fetchMetricLineage(params: {
  scopeQuery: string;
  month: string;
  metric: LineageMetric;
}): Promise<ReportLineageResponse> {
  const response = await fetchWithTimeout(
    `/api/reports/monthly/lineage?${params.scopeQuery}&month=${encodeURIComponent(params.month)}&metric=${params.metric}&limit=18`,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load audit-ready lineage"));
  }

  return (await response.json()) as ReportLineageResponse;
}

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(parsed));
}

function Tile({
  title,
  value,
  sub
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <article className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--text)] shadow-[var(--shadow-soft)]">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--subtle)]">{title}</p>
      <p className="mt-3 text-[clamp(2rem,3vw,3rem)] font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{sub}</p>
    </article>
  );
}

export function OverviewDashboard() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [timeRange, setTimeRange] = useState<TimeRange>("MTD");
  const [reportMonth, setReportMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [auditMetric, setAuditMetric] = useState<LineageMetric>("revenue");
  const [showAuditReady, setShowAuditReady] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [closeMonthResult, setCloseMonthResult] = useState<MonthCloseResponse | null>(null);
  const internalDemoToolsEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_INTERNAL_DEMO_TOOLS === "true";

  const scoped = useMemo(
    () => toScope(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const scopeQuery = scoped.scopeQuery;
  const scopeLabel = scoped.scopeLabel;
  const scopeBody = scoped.scopeBody;

  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview-tiles", scopeQuery, timeRange],
    queryFn: () => fetchOverview(scopeQuery, timeRange),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const healthQuery = useQuery({
    queryKey: ["dashboard", "health-tiles", scopeQuery],
    queryFn: () => fetchHealth(scopeQuery),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const transactionSummaryQuery = useQuery({
    queryKey: ["dashboard", "transaction-summary", scopeQuery],
    queryFn: () => fetchTransactionSummary(scopeQuery),
    retry: false,
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const lineageQuery = useQuery({
    queryKey: ["dashboard", "report-lineage", scopeQuery, reportMonth, auditMetric],
    queryFn: () =>
      fetchMetricLineage({
        scopeQuery,
        month: reportMonth,
        metric: auditMetric
      }),
    enabled:
      !transactionSummaryQuery.isError &&
      (transactionSummaryQuery.data?.total ?? 0) > 0,
    retry: false,
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const closeMonthMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithTimeout("/api/month-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          month: reportMonth,
          sendWhatsAppDigest: false
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to run month close"));
      }

      return (await response.json()) as MonthCloseResponse;
    },
    onSuccess: async (result) => {
      setCloseMonthResult(result);
      const verificationText =
        result.verification?.checks?.dbTouched === true
          ? "DB changes confirmed."
          : result.verification?.checks?.dbTouched === false
            ? "No net DB delta (likely already clean)."
            : "DB verification unavailable.";
      setNotice(
        `Month close complete: ${result.categorize?.tagged ?? 0} tagged, ${result.reconcile?.suggestions ?? 0} reconciliation suggestions, ${result.alerts?.statusCounts?.opened ?? 0} alerts opened. ${verificationText}`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics"] }),
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["integrations"] }),
        overviewQuery.refetch(),
        healthQuery.refetch(),
        transactionSummaryQuery.refetch(),
        lineageQuery.refetch()
      ]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ledger:refresh"));
      }
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Month close failed");
    }
  });

  const demoSeedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchWithTimeout("/api/workspaces/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          month: reportMonth,
          rowCountPerProvider: 8
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to seed demo workspace"));
      }

      return (await response.json()) as {
        categoriesEnsured?: number;
        syncResults?: Array<{ provider: string; rowsInserted?: number; ok: boolean }>;
      };
    },
    onSuccess: async (result) => {
      const inserted = (result.syncResults ?? []).reduce(
        (accumulator, entry) => accumulator + (entry.rowsInserted ?? 0),
        0
      );
      setNotice(
        `Demo workspace seeded: ${result.categoriesEnsured ?? 0} categories ensured, ${inserted} transactions inserted.`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics"] }),
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["integrations"] }),
        overviewQuery.refetch(),
        healthQuery.refetch(),
        transactionSummaryQuery.refetch(),
        lineageQuery.refetch()
      ]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ledger:refresh"));
      }
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Demo seed failed");
    }
  });

  const overview = overviewQuery.data ?? FALLBACK_OVERVIEW;
  const health = healthQuery.data ?? FALLBACK_HEALTH;

  const isLoading = overviewQuery.isLoading || healthQuery.isLoading;
  const hasError = overviewQuery.isError || healthQuery.isError || transactionSummaryQuery.isError;
  const refreshTone =
    hasError ? "issues" : overviewQuery.isFetching || healthQuery.isFetching ? "syncing" : "healthy";
  const refreshText = hasError
    ? "Metric issue"
    : overviewQuery.isFetching || healthQuery.isFetching
      ? "Refreshing"
      : "Live";

  const ledgerHealth = clampPercent(health.compliance_confidence);
  const gstDueDays = Math.max(0, Math.round(overview.gst_due_days));
  const runwayDays = Math.max(0, Math.round(overview.runway_days));
  const monthClosePct = clampPercent(health.month_close_readiness_pct);

  const openAlerts =
    Math.max(0, Math.trunc(overview.anomaly_count)) +
    (health.gst_due_amount_next_7d > 0 ? 1 : 0) +
    (health.itc_mismatch_count > 0 ? 1 : 0);
  const hasTransactions = (transactionSummaryQuery.data?.total ?? 0) > 0;
  const lineageIds = (lineageQuery.data?.lineage.transactions ?? [])
    .map((row) => row.id)
    .slice(0, 40);
  const lineageHref =
    lineageIds.length > 0
      ? `/app/ledger?${scopeQuery}&ids=${encodeURIComponent(lineageIds.join(","))}`
      : null;

  const rangeLabel = formatDateRangeLabel(timeRange);

  return (
    <section className="space-y-4">
      <header className="rounded-[24px] border border-white/12 bg-zinc-950/88 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="ui-label">Overview</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
              Dashboard health monitor
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Consuming <code>/api/metrics/overview</code> + <code>/api/metrics/health</code> for live tiles.
            </p>
            <p className="mt-2 text-xs text-zinc-500">{scopeLabel}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusPill tone={refreshTone}>{refreshText}</StatusPill>
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <p className="text-[11px] text-zinc-400">{rangeLabel}</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                type="month"
                value={reportMonth}
                onChange={(event) => setReportMonth(event.target.value)}
                className="rounded-lg border border-white/20 bg-black/45 px-2 py-1.5 text-xs text-zinc-100"
                aria-label="Month close period"
              />
              <button
                type="button"
                onClick={() => closeMonthMutation.mutate()}
                disabled={closeMonthMutation.isPending}
                className="rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
              >
                {closeMonthMutation.isPending ? "Closing month..." : "Close month"}
              </button>
              <button
                type="button"
                onClick={() => setShowAuditReady((value) => !value)}
                className="rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/12"
              >
                {showAuditReady ? "Hide audit-ready" : "Audit-ready view"}
              </button>
              {internalDemoToolsEnabled ? (
                <button
                  type="button"
                  onClick={() => demoSeedMutation.mutate()}
                  disabled={demoSeedMutation.isPending}
                  className="rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
                >
                  {demoSeedMutation.isPending
                    ? "Seeding demo..."
                    : "Demo workspace seed"}
                </button>
              ) : null}
            </div>
            <p className="text-[11px] text-zinc-500">
              Close month runs bulk categorize, reconciliation suggestions, alerts, and report generation.
            </p>
          </div>
        </div>
      </header>

      {notice ? (
        <div className="rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs text-zinc-200">
          {notice}
        </div>
      ) : null}

      {hasError ? (
        <ErrorState
          message={
            overviewQuery.error instanceof Error
              ? overviewQuery.error.message
              : healthQuery.error instanceof Error
                ? healthQuery.error.message
                : transactionSummaryQuery.error instanceof Error
                  ? transactionSummaryQuery.error.message
                  : "Failed to load one or more dashboard tiles"
          }
          onRetry={() => {
            void Promise.all([
              overviewQuery.refetch(),
              healthQuery.refetch(),
              transactionSummaryQuery.refetch()
            ]);
          }}
        />
      ) : null}

      {!hasError &&
      !transactionSummaryQuery.isLoading &&
      !transactionSummaryQuery.isError &&
      !hasTransactions ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-black/45 px-4 py-5 text-center">
          <p className="text-sm font-medium text-zinc-100">No transactions yet</p>
          <p className="mt-1 text-xs text-zinc-400">
            Upload CSV data to initialize ledger health, GST readiness, and runway metrics.
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <Link
              href="/app/onboarding"
              className="rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12"
            >
              Upload CSV
            </Link>
            <Link
              href="/app/ledger"
              className="rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12"
            >
              Open ledger
            </Link>
          </div>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Tile
          title="Ledger health"
          value={`${ledgerHealth.toFixed(1)}%`}
          sub={`Reconciliation ${clampPercent(health.recon_match_pct).toFixed(1)}%`}
        />
        <Tile
          title="GST readiness"
          value={gstDueDays > 0 ? `${gstDueDays} days` : "Due now"}
          sub={`Est payable ${formatInr(overview.gst_est_payable, { maximumFractionDigits: 2 })}`}
        />
        <Tile
          title="Runway"
          value={`${runwayDays} days`}
          sub={`${health.cash_runway_months.toFixed(1)} months at current burn`}
        />
        <Tile
          title="Open alerts"
          value={String(openAlerts)}
          sub={`GST + ITC + anomalies across active rules`}
        />
        <Tile
          title="Month-close %"
          value={`${monthClosePct.toFixed(1)}%`}
          sub={isLoading ? "Updating close checklist..." : "Checklist completion"}
        />
      </section>

      {closeMonthResult ? (
        <section className="rounded-[22px] border border-white/12 bg-black/45 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Month close run</p>
              <h2 className="mt-1 text-sm font-semibold text-zinc-100">
                {closeMonthResult.monthLabel} close completed
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Total {Math.round(closeMonthResult.durationMs / 1000)}s
            </p>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-5">
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
              Tagged: {closeMonthResult.categorize?.tagged ?? 0}
            </div>
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
              Reconcile suggestions: {closeMonthResult.reconcile?.suggestions ?? 0}
            </div>
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
              Alerts opened: {closeMonthResult.alerts?.statusCounts?.opened ?? 0}
            </div>
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
              Profit estimate: {formatInr(closeMonthResult.report?.metrics?.profitEstimate ?? 0)}
            </div>
            <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
              GST payable: {formatInr(closeMonthResult.report?.metrics?.gstPayableEstimate ?? 0)}
            </div>
          </div>
          <div className="mt-2 grid gap-2 text-[11px] text-zinc-400 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              API run: {closeMonthResult.verification?.checks?.apiRun ? "yes" : "no"}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              DB touched:{" "}
              {closeMonthResult.verification?.checks?.dbTouched === true
                ? "yes"
                : closeMonthResult.verification?.checks?.dbTouched === false
                  ? "no"
                  : "unknown"}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Alerts evaluated:{" "}
              {closeMonthResult.verification?.checks?.alertsEvaluated ? "yes" : "no"}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              Report generated:{" "}
              {closeMonthResult.verification?.checks?.reportGenerated ? "yes" : "no"}
            </div>
          </div>
        </section>
      ) : null}

      {showAuditReady ? (
        <section className="rounded-[22px] border border-white/12 bg-black/45 p-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Audit-ready</p>
              <h2 className="mt-1 text-base font-semibold text-zinc-100">
                Report metric lineage + audit trail
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Select a monthly metric to inspect contributing transactions and immutable audit events.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={auditMetric}
                onChange={(event) => setAuditMetric(event.target.value as LineageMetric)}
                className="rounded-lg border border-white/20 bg-black/45 px-2 py-1.5 text-xs text-zinc-100"
              >
                <option value="revenue">Revenue</option>
                <option value="expenses">Expenses</option>
                <option value="profitEstimate">Profit estimate</option>
                <option value="gstPayableEstimate">GST payable estimate</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  void lineageQuery.refetch();
                }}
                disabled={lineageQuery.isFetching}
                className="rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
              >
                {lineageQuery.isFetching ? "Refreshing..." : "Refresh lineage"}
              </button>
              {lineageHref ? (
                <Link
                  href={lineageHref}
                  className="rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/12"
                >
                  Open linked rows
                </Link>
              ) : null}
            </div>
          </header>

          {lineageQuery.isLoading ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-xs text-zinc-400">
              Loading lineage...
            </div>
          ) : lineageQuery.isError ? (
            <div className="mt-3">
              <ErrorState
                message={
                  lineageQuery.error instanceof Error
                    ? lineageQuery.error.message
                    : "Failed to load report lineage"
                }
                onRetry={() => {
                  void lineageQuery.refetch();
                }}
              />
            </div>
          ) : lineageQuery.data ? (
            <>
              <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-4">
                <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
                  Metric value: {formatInr(lineageQuery.data.metricValue, { maximumFractionDigits: 2 })}
                </div>
                <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
                  Lineage rows: {lineageQuery.data.lineage.count}
                </div>
                <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
                  Contribution total: {formatInr(lineageQuery.data.lineage.contributionTotal, { maximumFractionDigits: 2, signed: true })}
                </div>
                <div className="rounded-lg border border-white/12 bg-white/6 px-3 py-2">
                  Audit logs: {lineageQuery.data.auditLogs.length}
                </div>
              </div>

              <p className="mt-2 text-xs text-zinc-500">{lineageQuery.data.formula}</p>

              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="rounded-xl border border-white/12 bg-black/35 p-3">
                  <p className="text-xs font-medium text-zinc-200">Transaction lineage</p>
                  {lineageQuery.data.lineage.transactions.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">No contributing transactions for this metric.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {lineageQuery.data.lineage.transactions.map((row) => (
                        <article
                          key={`${row.id}-${row.contributionComponent}`}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-zinc-100">
                                {row.description ?? row.counterparty ?? `Transaction ${row.id}`}
                              </p>
                              <p className="mt-1 truncate text-[11px] text-zinc-400">
                                {formatDateTime(row.occurredAt)} • {row.source} •{" "}
                                {row.categoryName ?? "uncategorized"}
                              </p>
                            </div>
                            <p className="shrink-0 text-xs text-zinc-200">
                              {formatInr(row.contribution, {
                                maximumFractionDigits: 2,
                                signed: true
                              })}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <aside className="rounded-xl border border-white/12 bg-black/35 p-3">
                  <p className="text-xs font-medium text-zinc-200">Audit logs</p>
                  {lineageQuery.data.auditLogs.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">No audit entries for current lineage selection.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {lineageQuery.data.auditLogs.map((log) => (
                        <article
                          key={log.id}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <p className="text-xs font-medium text-zinc-100">{log.action}</p>
                          <p className="mt-1 text-[11px] text-zinc-400">
                            {formatDateTime(log.createdAt)} • {log.actorType} • txn {log.entityId}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-xs text-zinc-400">
              Select a metric to inspect lineage.
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
