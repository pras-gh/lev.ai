"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CloudUpload,
  Landmark,
  Loader2,
  Settings2,
  WalletCards
} from "lucide-react";
import {
  ErrorState,
  StatusPill,
  TimeRangePicker,
  type TimeRange
} from "@/components/design-system";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { formatDateRangeLabel, formatInr } from "@/lib/formatters";

type OverviewRange = "MTD" | "30D" | "90D";
type SyncHealthStatus = "idle" | "syncing" | "healthy" | "issues";
type FirstRunMode = "auto" | "zero" | "partial" | "live";
type FirstRunViewState = "zero" | "partial" | "live";
type QuickConnectProvider = "hdfc" | "razorpay";

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
};

type SyncProvider = {
  provider: string;
  integration_status: string | null;
  latest_run_status: string | null;
};

type SyncStatusPayload = {
  status: SyncHealthStatus;
  activeRuns: number;
  failedRunsLast24h: number;
  lastRunAt: string | null;
  providers: SyncProvider[];
};

type TransactionSummary = {
  total: number;
};

type AlertApiRow = {
  id: number;
  severity: "critical" | "warning" | "info";
  title: string | null;
  message: string;
};

type AlertListItem = {
  title: string;
  severity: "High" | "Medium" | "Low";
};

type SyncPillState = {
  tone: "healthy" | "syncing" | "issues" | "neutral";
  text: string;
};

type MetricCardProps = {
  title: ReactNode;
  kpi: string;
  sub: string;
  cta?: string;
  refreshQuietly?: boolean;
  stateLabel?: {
    label: "Healthy" | "Watch" | "Risk";
    tone: "healthy" | "watch" | "risk";
  };
  children?: ReactNode;
};

const EMPTY_METRICS: OverviewMetrics = {
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
  month_close_readiness_pct: 0
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

function mapTimeRangeToOverviewRange(value: TimeRange): OverviewRange {
  return value;
}

function formatRelativeTime(input: string | null): string {
  if (!input) {
    return "Updated recently";
  }

  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) {
    return "Updated recently";
  }

  const deltaMs = Date.now() - parsed;
  if (deltaMs < 45_000) {
    return "Updated just now";
  }

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `Updated ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Updated ${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

function syncPillFromStatus(status: SyncStatusPayload | undefined, isError: boolean): SyncPillState {
  if (isError) {
    return { tone: "issues", text: "Action needed" };
  }

  if (!status) {
    return { tone: "neutral", text: "Updated recently" };
  }

  if (status.status === "issues") {
    return { tone: "issues", text: "Action needed" };
  }

  if (status.status === "syncing") {
    return { tone: "syncing", text: "Syncing..." };
  }

  if (status.status === "idle") {
    return { tone: "neutral", text: "No data source connected" };
  }

  if (status.status === "healthy") {
    return { tone: "healthy", text: formatRelativeTime(status.lastRunAt) };
  }

  return { tone: "neutral", text: formatRelativeTime(status.lastRunAt) };
}

function runwayState(days: number): MetricCardProps["stateLabel"] {
  if (days >= 60) {
    return { label: "Healthy", tone: "healthy" };
  }

  if (days >= 30) {
    return { label: "Watch", tone: "watch" };
  }

  return { label: "Risk", tone: "risk" };
}

function parseFirstRunMode(value: string | null): FirstRunMode {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "zero" || normalized === "partial" || normalized === "live") {
    return normalized;
  }

  return "auto";
}

function deriveFirstRunState(params: {
  forcedMode: FirstRunMode;
  transactionTotal: number | undefined;
  syncStatus: SyncStatusPayload | undefined;
}): FirstRunViewState {
  if (params.forcedMode === "zero" || params.forcedMode === "partial" || params.forcedMode === "live") {
    return params.forcedMode;
  }

  const total = params.transactionTotal;
  if (total === undefined) {
    return "live";
  }

  if (total > 0) {
    return "live";
  }

  const status = params.syncStatus;
  if (!status) {
    return "zero";
  }

  const hasProviders = status.providers.length > 0;
  const hasLinkedSource = status.providers.some((provider) => {
    const integrationStatus = (provider.integration_status ?? "").toLowerCase();
    return integrationStatus === "connected" || integrationStatus === "syncing" || integrationStatus === "error";
  });

  const hasSyncSignals =
    status.activeRuns > 0 ||
    status.failedRunsLast24h > 0 ||
    Boolean(status.lastRunAt) ||
    hasProviders ||
    hasLinkedSource;

  return hasSyncSignals ? "partial" : "zero";
}

function integrationLabel(provider: QuickConnectProvider): string {
  if (provider === "razorpay") {
    return "Razorpay";
  }

  return "HDFC Bank";
}

async function fetchOverviewMetrics(scopeQuery: string, range: OverviewRange): Promise<OverviewMetrics> {
  const response = await fetchWithTimeout(`/api/metrics/overview?${scopeQuery}&range=${range}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load overview metrics"));
  }

  const payload = (await response.json()) as Partial<OverviewMetrics>;

  return {
    cash_balance: toNumber(payload.cash_balance, 0),
    runway_days: toNumber(payload.runway_days, 0),
    revenue_mtd: toNumber(payload.revenue_mtd, 0),
    expenses_mtd: toNumber(payload.expenses_mtd, 0),
    gst_due_days: toNumber(payload.gst_due_days, 0),
    gst_est_payable: toNumber(payload.gst_est_payable, 0),
    itc_mismatch_count: toNumber(payload.itc_mismatch_count, 0),
    itc_mismatch_value: toNumber(payload.itc_mismatch_value, 0),
    reconciliation_pct: toNumber(payload.reconciliation_pct, 0),
    anomaly_count: toNumber(payload.anomaly_count, 0),
    month_close_readiness_pct: toNumber(payload.month_close_readiness_pct, 0)
  };
}

async function fetchSyncStatus(scopeQuery: string): Promise<SyncStatusPayload> {
  const response = await fetchWithTimeout(`/api/sync/status?${scopeQuery}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load sync status"));
  }

  const payload = (await response.json()) as {
    status?: SyncHealthStatus;
    activeRuns?: number;
    failedRunsLast24h?: number;
    lastRunAt?: string | null;
    providers?: SyncProvider[];
  };

  return {
    status: payload.status ?? "idle",
    activeRuns: Math.max(0, Math.trunc(toNumber(payload.activeRuns, 0))),
    failedRunsLast24h: Math.max(0, Math.trunc(toNumber(payload.failedRunsLast24h, 0))),
    lastRunAt: typeof payload.lastRunAt === "string" ? payload.lastRunAt : null,
    providers: Array.isArray(payload.providers) ? payload.providers : []
  };
}

async function fetchAlerts(scopeQuery: string): Promise<AlertListItem[]> {
  const response = await fetchWithTimeout(`/api/alerts?${scopeQuery}&status=open&page=1&limit=3`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { alerts?: AlertApiRow[] };
  const rows = payload.alerts ?? [];

  return rows.slice(0, 3).map((row) => ({
    title: row.title?.trim() || row.message,
    severity: row.severity === "critical" ? "High" : row.severity === "warning" ? "Medium" : "Low"
  }));
}

async function fetchTransactionSummary(scopeQuery: string): Promise<TransactionSummary> {
  const response = await fetchWithTimeout(`/api/transactions?${scopeQuery}&page=1&pageSize=1`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load transaction summary"));
  }

  const payload = (await response.json()) as { total?: number };
  return {
    total: Math.max(0, Math.trunc(toNumber(payload.total, 0)))
  };
}

function MetricCard({ title, kpi, sub, cta, refreshQuietly, stateLabel, children }: MetricCardProps) {
  const stateToneClass =
    stateLabel?.tone === "healthy"
      ? "border-zinc-300 bg-zinc-100 text-zinc-700"
      : stateLabel?.tone === "watch"
        ? "border-zinc-400 bg-zinc-200 text-zinc-800"
        : stateLabel?.tone === "risk"
          ? "border-zinc-600 bg-zinc-300 text-zinc-900"
          : "";

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--text)] shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
        {stateLabel ? (
          <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${stateToneClass}`}>
            {stateLabel.label}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[clamp(2.5rem,4vw,3.8rem)] font-medium leading-none tracking-tight text-[var(--text)]">
        {kpi}
      </p>
      <p className="mt-2 text-xs text-[var(--subtle)]">{sub}</p>

      {children}

      {cta ? (
        <button
          type="button"
          className="mt-3 inline-flex text-sm font-medium text-[var(--text)] transition hover:text-[var(--accent)]"
        >
          {cta}
        </button>
      ) : null}

      {refreshQuietly ? (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <span className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/26 to-transparent [animation:calm-shimmer_1.8s_ease-in-out_infinite]" />
        </span>
      ) : null}
    </article>
  );
}

function SkeletonMetricCard({ title }: { title: string }) {
  return (
    <article className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
      <div className="mt-3 h-10 w-28 animate-pulse rounded-lg bg-zinc-200/65" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-zinc-200/50" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-zinc-200/40" />
    </article>
  );
}

function TermHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <span
        tabIndex={0}
        title={hint}
        aria-label={`${label}: ${hint}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] text-[10px] font-semibold text-[var(--subtle)]"
      >
        i
      </span>
    </span>
  );
}

export function InspiredLedgerDashboard() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const workspaceParam = searchParams.get("workspaceId");
  const businessParam = searchParams.get("businessId") ?? "1";
  const [timeRange, setTimeRange] = useState<TimeRange>("30D");
  const [criticalToast, setCriticalToast] = useState<string | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastKeyRef = useRef<string | null>(null);

  const businessIdNumber = useMemo(() => {
    const parsed = Number.parseInt(businessParam, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }, [businessParam]);

  const scopeQuery = useMemo(() => {
    const next = new URLSearchParams();

    if (workspaceParam) {
      next.set("workspaceId", workspaceParam);
    } else {
      next.set("businessId", String(businessIdNumber));
    }

    return next.toString();
  }, [businessIdNumber, workspaceParam]);

  const scopeBody = useMemo(
    () => (workspaceParam ? { workspaceId: workspaceParam } : { businessId: businessIdNumber }),
    [businessIdNumber, workspaceParam]
  );

  const overviewRange = mapTimeRangeToOverviewRange(timeRange);
  const rangeLabel = useMemo(() => formatDateRangeLabel(overviewRange), [overviewRange]);
  const forcedFirstRunMode = parseFirstRunMode(searchParams.get("firstRun"));

  const metricsQuery = useQuery({
    queryKey: ["dashboard", "overview", scopeQuery, overviewRange],
    queryFn: () => fetchOverviewMetrics(scopeQuery, overviewRange),
    retry: 0,
    staleTime: 10_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const syncStatusQuery = useQuery({
    queryKey: ["dashboard", "sync-status", scopeQuery],
    queryFn: () => fetchSyncStatus(scopeQuery),
    retry: 0,
    staleTime: 10_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const alertsQuery = useQuery({
    queryKey: ["dashboard", "alerts-summary", scopeQuery],
    queryFn: () => fetchAlerts(scopeQuery),
    retry: 0,
    staleTime: 10_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "transaction-summary", scopeQuery],
    queryFn: () => fetchTransactionSummary(scopeQuery),
    retry: 0,
    staleTime: 10_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const connectSourceMutation = useMutation({
    mutationFn: async (provider: QuickConnectProvider) => {
      const response = await fetchWithTimeout("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          provider,
          credentialToken: "first_run_guided_token",
          accountLabel: `${integrationLabel(provider)} - Guided Connect`
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to connect source"));
      }

      return response.json() as Promise<{ message?: string }>;
    },
    onSuccess: async (payload, provider) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "sync-status", scopeQuery] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "transaction-summary", scopeQuery] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview", scopeQuery] })
      ]);

      setInlineNotice(payload.message ?? `${integrationLabel(provider)} connected. Start a sync to ingest rows.`);
    },
    onError: (error) => {
      setInlineNotice(error instanceof Error ? error.message : "Failed to connect source");
    }
  });

  const uploadCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const csv = await file.text();
      const response = await fetchWithTimeout("/api/transactions/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          csv,
          source: "csv_import"
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to upload CSV"));
      }

      return response.json() as Promise<{
        parsed?: { totalRows?: number; normalizedRows?: number };
        insert?: { inserted?: number; skippedAsDuplicate?: number };
      }>;
    },
    onSuccess: async (payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview", scopeQuery] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "alerts-summary", scopeQuery] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "transaction-summary", scopeQuery] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "sync-status", scopeQuery] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] })
      ]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ledger:refresh"));
      }

      const parsedRows = payload.parsed?.normalizedRows ?? payload.parsed?.totalRows ?? 0;
      const insertedRows = payload.insert?.inserted ?? parsedRows;
      const skipped = payload.insert?.skippedAsDuplicate ?? 0;
      setInlineNotice(`CSV imported: ${insertedRows} inserted, ${skipped} duplicate skipped.`);
    },
    onError: (error) => {
      setInlineNotice(error instanceof Error ? error.message : "Failed to upload CSV");
    }
  });

  const metrics = metricsQuery.data ?? EMPTY_METRICS;
  const alertRows = alertsQuery.data ?? [];
  const syncPill = syncPillFromStatus(syncStatusQuery.data, syncStatusQuery.isError);
  const metricsRefreshing = metricsQuery.isFetching && !metricsQuery.isPending;
  const firstRunState = deriveFirstRunState({
    forcedMode: forcedFirstRunMode,
    transactionTotal: summaryQuery.data?.total,
    syncStatus: syncStatusQuery.data
  });

  const isCriticalSyncFailure =
    syncStatusQuery.isError || syncStatusQuery.data?.status === "issues";
  const hasBlockingLoadError =
    (metricsQuery.isError && !metricsQuery.data) ||
    (syncStatusQuery.isError && !syncStatusQuery.data) ||
    (summaryQuery.isError && !summaryQuery.data) ||
    (alertsQuery.isError && !alertsQuery.data);
  const loadErrorMessage =
    metricsQuery.error instanceof Error
      ? metricsQuery.error.message
      : syncStatusQuery.error instanceof Error
        ? syncStatusQuery.error.message
        : summaryQuery.error instanceof Error
          ? summaryQuery.error.message
          : alertsQuery.error instanceof Error
            ? alertsQuery.error.message
            : "Failed to load dashboard data";

  useEffect(() => {
    if (!isCriticalSyncFailure) {
      toastKeyRef.current = null;
      setCriticalToast(null);
      return;
    }

    const nextKey = syncStatusQuery.isError ? "sync-endpoint-failure" : "sync-health-failure";
    if (toastKeyRef.current === nextKey) {
      return;
    }

    toastKeyRef.current = nextKey;
    setCriticalToast(
      syncStatusQuery.isError
        ? "Critical failure: sync status unavailable."
        : "Critical failure: sync action needed."
    );

    const timeout = window.setTimeout(() => {
      setCriticalToast(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isCriticalSyncFailure, syncStatusQuery.isError]);

  function openCsvPicker() {
    if (uploadCsvMutation.isPending) {
      return;
    }

    fileInputRef.current?.click();
  }

  function handleCsvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    uploadCsvMutation.mutate(file);
    event.target.value = "";
  }

  const runway = Math.max(0, Math.round(metrics.runway_days));
  const reconciliationPct = Math.max(0, Math.min(100, metrics.reconciliation_pct));
  const unmatchedTransactions = Math.max(0, Math.round((100 - reconciliationPct) * 2));
  const alertsKpi = Math.max(0, Math.round(metrics.anomaly_count));
  const partialSyncHint =
    syncStatusQuery.data?.activeRuns && syncStatusQuery.data.activeRuns > 0
      ? `Syncing ${syncStatusQuery.data.activeRuns} source(s)...`
      : `Waiting for bank sync. ${syncPill.text}.`;

  return (
    <section className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvSelected}
      />

      <article className="relative overflow-hidden rounded-[24px] border border-white/12 bg-zinc-950/88 p-5 md:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_100%,rgba(255,122,26,0.16),rgba(255,122,26,0)_60%)]"
        />
        <div className="relative flex flex-wrap items-center gap-3">
          <div>
            <p className="ui-label">Top tabs</p>
            <nav className="mt-2 inline-flex rounded-xl border border-white/14 bg-white/5 p-1">
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
              >
                Overview
              </button>
            </nav>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusPill tone={syncPill.tone}>{syncPill.text}</StatusPill>
            <div className="text-right">
              <TimeRangePicker value={timeRange} onChange={setTimeRange} />
              <p className="mt-1 text-[11px] text-zinc-400">{rangeLabel}</p>
            </div>
            <button
              type="button"
              className="ui-button inline-flex items-center gap-1 px-3 py-2"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Settings
            </button>
          </div>
        </div>
      </article>

      {inlineNotice ? (
        <div className="rounded-xl border border-zinc-300/60 bg-zinc-100/80 px-3 py-2 text-xs text-zinc-800">
          {inlineNotice}
        </div>
      ) : null}

      {hasBlockingLoadError ? (
        <ErrorState
          message={loadErrorMessage}
          onRetry={() => {
            setInlineNotice(null);
            void Promise.all([
              metricsQuery.refetch(),
              syncStatusQuery.refetch(),
              alertsQuery.refetch(),
              summaryQuery.refetch()
            ]);
          }}
        />
      ) : null}

      {firstRunState === "zero" ? (
        <section className="rounded-[24px] border border-white/14 bg-zinc-950/82 p-5 text-zinc-100 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div className="flex items-start gap-3">
            <WalletCards className="mt-0.5 h-5 w-5 text-zinc-300" />
            <div>
              <h2 className="text-xl font-medium tracking-tight">Connect a data source to start</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-300">
                Bring in your first transactions and unlock live GST readiness, auto-tagging, and proactive alerts.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/18 bg-white/7 px-3 py-1 text-xs text-zinc-200">
                  Live GST readiness
                </span>
                <span className="rounded-full border border-white/18 bg-white/7 px-3 py-1 text-xs text-zinc-200">
                  Auto-tagging
                </span>
                <span className="rounded-full border border-white/18 bg-white/7 px-3 py-1 text-xs text-zinc-200">
                  Alerts
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={openCsvPicker}
              disabled={uploadCsvMutation.isPending}
              className="group rounded-2xl border border-white/14 bg-white/6 p-4 text-left transition hover:border-white/28 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex items-center justify-between">
                <CloudUpload className="h-4 w-4 text-zinc-300" />
                {uploadCsvMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              </div>
              <p className="mt-3 text-sm font-medium">Upload CSV</p>
              <p className="mt-1 text-xs text-zinc-400">Drop exported bank or UPI statements.</p>
            </button>

            <button
              type="button"
              onClick={() => connectSourceMutation.mutate("razorpay")}
              disabled={connectSourceMutation.isPending}
              className="group rounded-2xl border border-white/14 bg-white/6 p-4 text-left transition hover:border-white/28 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex items-center justify-between">
                <Building2 className="h-4 w-4 text-zinc-300" />
                {connectSourceMutation.isPending && connectSourceMutation.variables === "razorpay" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
              </div>
              <p className="mt-3 text-sm font-medium">Connect Razorpay</p>
              <p className="mt-1 text-xs text-zinc-400">Enable payout and settlement sync.</p>
            </button>

            <button
              type="button"
              onClick={() => connectSourceMutation.mutate("hdfc")}
              disabled={connectSourceMutation.isPending}
              className="group rounded-2xl border border-white/14 bg-white/6 p-4 text-left transition hover:border-white/28 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="flex items-center justify-between">
                <Landmark className="h-4 w-4 text-zinc-300" />
                {connectSourceMutation.isPending && connectSourceMutation.variables === "hdfc" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
              </div>
              <p className="mt-3 text-sm font-medium">Connect Bank</p>
              <p className="mt-1 text-xs text-zinc-400">Start continuous bank feed ingestion.</p>
            </button>
          </div>
        </section>
      ) : null}

      {firstRunState === "partial" ? (
        <section className="space-y-3">
          <article className="rounded-[24px] border border-white/12 bg-zinc-950/82 p-5 text-zinc-100 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">First sync in progress</p>
            <h2 className="mt-2 text-xl font-medium tracking-tight">Waiting for bank sync</h2>
            <p className="mt-2 text-sm text-zinc-300">{partialSyncHint}</p>
            <p className="mt-1 text-xs text-zinc-400">
              KPI cards will populate as soon as transactions land. We avoid showing misleading zero values during sync.
            </p>
          </article>

          <section className="grid grid-cols-12 gap-3">
            <div className="col-span-12 grid gap-3 xl:col-span-4">
              <SkeletonMetricCard title="Cash balance" />
              <SkeletonMetricCard title="Cash runway" />
            </div>
            <div className="col-span-12 grid gap-3 xl:col-span-4">
              <SkeletonMetricCard title="Revenue" />
              <SkeletonMetricCard title="Expenses" />
            </div>
            <div className="col-span-12 grid gap-3 xl:col-span-4">
              <SkeletonMetricCard title="GST due in" />
              <SkeletonMetricCard title="ITC mismatch" />
            </div>
          </section>
        </section>
      ) : null}

      {firstRunState === "live" ? (
        <>
          <section className="grid grid-cols-12 gap-3">
            <div className="col-span-12 grid gap-3 xl:col-span-4">
              <MetricCard
                title="Cash balance"
                kpi={formatInr(metrics.cash_balance)}
                sub="Across posted ledger transactions"
                cta="View cash ledger →"
                refreshQuietly={metricsRefreshing}
              />

              <MetricCard
                title="Cash runway"
                kpi={`${runway} days`}
                sub="Based on last 30d burn"
                stateLabel={runwayState(runway)}
                refreshQuietly={metricsRefreshing}
              />
            </div>

            <div className="col-span-12 grid gap-3 xl:col-span-4">
              <MetricCard
                title="Revenue"
                kpi={formatInr(metrics.revenue_mtd)}
                sub="Month-to-date collections"
                refreshQuietly={metricsRefreshing}
              />

              <MetricCard
                title="Expenses"
                kpi={formatInr(metrics.expenses_mtd)}
                sub="Month-to-date payouts"
                refreshQuietly={metricsRefreshing}
              />
            </div>

            <div className="col-span-12 grid gap-3 xl:col-span-4">
              <MetricCard
                title={
                  <TermHint
                    label="GST due in"
                    hint="Estimated days left before next GST payment cycle based on current ledger."
                  />
                }
                kpi={`${Math.max(0, Math.round(metrics.gst_due_days))} days`}
                sub={`Est payable: ${formatInr(metrics.gst_est_payable)}`}
                cta="Review GST summary →"
                refreshQuietly={metricsRefreshing}
              />

              <MetricCard
                title={
                  <TermHint
                    label="ITC mismatch"
                    hint="Input tax credit entries missing invoice evidence or expected match details."
                  />
                }
                kpi={`${Math.max(0, Math.round(metrics.itc_mismatch_count))}`}
                sub={`${formatInr(metrics.itc_mismatch_value)} potential mismatch value`}
                refreshQuietly={metricsRefreshing}
              />
            </div>
          </section>

          <section className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <MetricCard
                title={
                  <TermHint
                    label="Reconciliation"
                    hint="Share of rows matched between source events and ledger records."
                  />
                }
                kpi={`${reconciliationPct.toFixed(0)}% matched`}
                sub={`${unmatchedTransactions} unmatched transactions`}
                cta="Clean now →"
                refreshQuietly={metricsRefreshing}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <MetricCard
                title="Alerts"
                kpi={`${alertsKpi}`}
                sub={alertRows.length > 0 ? "Open issues requiring review" : "No active alerts"}
                cta="Open alerts →"
                refreshQuietly={metricsRefreshing}
              >
                {alertRows.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {alertRows.map((row, index) => (
                      <div key={`${row.title}-${index}`} className="flex items-center justify-between gap-2 text-xs">
                        <p className="truncate text-[var(--muted)]">{row.title}</p>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 ${
                            row.severity === "High"
                              ? "border-zinc-500/70 bg-zinc-300 text-zinc-900"
                              : row.severity === "Medium"
                                ? "border-zinc-400/70 bg-zinc-200 text-zinc-800"
                                : "border-zinc-300/70 bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {row.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </MetricCard>
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <MetricCard
                title="Anomalies"
                kpi={`${Math.max(0, Math.round(metrics.anomaly_count))}`}
                sub="Pattern breaks detected"
                refreshQuietly={metricsRefreshing}
              />
            </div>

            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <MetricCard
                title="Month-close readiness"
                kpi={`${Math.max(0, Math.min(100, metrics.month_close_readiness_pct)).toFixed(0)}%`}
                sub="Checklist completion status"
                refreshQuietly={metricsRefreshing}
              />
            </div>
          </section>
        </>
      ) : null}

      {criticalToast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-white/22 bg-zinc-950/95 px-4 py-3 text-xs text-zinc-100 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          {criticalToast}
        </div>
      ) : null}
    </section>
  );
}
