"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/design-system";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { formatInr } from "@/lib/formatters";

type AlertStatusFilter = "open" | "snoozed" | "resolved" | "all";
type AlertSeverityFilter = "all" | "critical" | "warning" | "info";
type AlertAction = "merge" | "ignore" | "resolve" | "snooze" | "reopen";

type ScopeBody = {
  workspaceId?: string;
  businessId?: number;
};

type FixAction = {
  label: string;
  kind: "open_filter" | "open_recon";
  preset?: string;
  recon?: string;
};

type AlertItem = {
  id: number;
  public_id?: string;
  type: string;
  alert_type?: string;
  severity: "critical" | "warning" | "info";
  status: "open" | "snoozed" | "resolved";
  title: string | null;
  body: string | null;
  message: string;
  transaction_id: number | null;
  related_transaction_ids?: unknown;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  action_url?: string | null;
  affected_transaction_ids?: number[];
  created_at: string;
  resolved_at: string | null;
};

type AlertsResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  alerts: AlertItem[];
};

type ActionInput = {
  alertId: number;
  action: AlertAction;
  keepTransactionId?: number;
};

type WhyRow = {
  label: string;
  value: string;
};

const TYPE_OPTIONS = [
  "all",
  "gst_due",
  "itc_mismatch",
  "refund_spike",
  "reconciliation_gap",
  "cash_runway_risk",
  "sync_failure",
  "anomaly_detected",
  "duplicate",
  "unmatched"
] as const;

const STATUS_OPTIONS: Array<{ value: AlertStatusFilter; label: string }> = [
  { value: "open", label: "Open" },
  { value: "snoozed", label: "Snoozed" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" }
];

const SEVERITY_OPTIONS: Array<{ value: AlertSeverityFilter; label: string }> = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" }
];

const KEY_ORDER = [
  "rule",
  "formula",
  "generatedAt",
  "dueDate",
  "dueInDays",
  "payableAmount",
  "outputGst",
  "eligibleItc",
  "mismatchCount",
  "mismatchAmount",
  "threshold",
  "thresholdAmount",
  "totalCount",
  "unmatchedCount",
  "gapPct",
  "thresholdPct",
  "runwayDays",
  "thresholdDays",
  "cashBalance",
  "avgDailyBurn",
  "burnRateDaily30d",
  "burnRateDaily60d",
  "burnRateDaily90d",
  "refundsThisWeek",
  "avgRefunds4w",
  "ratio",
  "ratioThreshold",
  "failedRuns",
  "partialRuns",
  "lookbackHours",
  "currentMonthExpense",
  "baselineExpense",
  "minDelta",
  "anomalyKind",
  "comparedMonths"
] as const;

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

function toScope(searchParams: URLSearchParams): { scopeQuery: string; scopeBody: ScopeBody } {
  const workspaceId = searchParams.get("workspaceId");
  const businessRaw = searchParams.get("businessId") ?? "1";
  const businessId = Number.parseInt(businessRaw, 10);
  const safeBusinessId = Number.isInteger(businessId) && businessId > 0 ? businessId : 1;

  if (workspaceId) {
    return {
      scopeQuery: `workspaceId=${encodeURIComponent(workspaceId)}`,
      scopeBody: { workspaceId }
    };
  }

  return {
    scopeQuery: `businessId=${encodeURIComponent(String(safeBusinessId))}`,
    scopeBody: { businessId: safeBusinessId }
  };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseRelatedIds(raw: unknown): number[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((value) => Number.parseInt(String(value), 10))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => Number.parseInt(String(value), 10))
          .filter((id) => Number.isInteger(id) && id > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function parseFixAction(payload: unknown): FixAction | null {
  const root = toRecord(payload);
  if (!root) {
    return null;
  }

  const raw = toRecord(root.fixAction);
  if (!raw) {
    return null;
  }

  const kindRaw = typeof raw.kind === "string" ? raw.kind : "";
  if (kindRaw !== "open_filter" && kindRaw !== "open_recon") {
    return null;
  }

  const label =
    typeof raw.label === "string" && raw.label.trim().length > 0
      ? raw.label.trim()
      : "Fix";

  const parsed: FixAction = {
    label,
    kind: kindRaw
  };

  if (typeof raw.preset === "string" && raw.preset.trim()) {
    parsed.preset = raw.preset.trim();
  }

  if (typeof raw.recon === "string" && raw.recon.trim()) {
    parsed.recon = raw.recon.trim();
  }

  return parsed;
}

function mapAlertTypeToPreset(type: string): string | null {
  if (type === "itc_mismatch" || type === "itc_available") {
    return "itc_mismatch";
  }

  if (type === "gst_due") {
    return "gst_due";
  }

  if (
    type === "unmatched" ||
    type === "reconciliation_gap" ||
    type === "vendor_mismatch_risk"
  ) {
    return "unmatched";
  }

  return null;
}

function getMetaPayload(alert: AlertItem | null): Record<string, unknown> | null {
  if (!alert) {
    return null;
  }

  return alert.meta ?? alert.metadata ?? alert.payload ?? null;
}

function getAffectedIds(alert: AlertItem): number[] {
  if (Array.isArray(alert.affected_transaction_ids) && alert.affected_transaction_ids.length > 0) {
    return alert.affected_transaction_ids
      .map((value) => Number(value))
      .filter((id, index, all) => Number.isInteger(id) && id > 0 && all.indexOf(id) === index);
  }

  const combined = [
    ...(alert.transaction_id ? [alert.transaction_id] : []),
    ...parseRelatedIds(alert.related_transaction_ids)
  ];

  return combined.filter((id, index, all) => Number.isInteger(id) && id > 0 && all.indexOf(id) === index);
}

function toPrettyJson(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "N/A";
  }

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

function formatRelativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "recently";
  }

  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 60_000) {
    return "just now";
  }

  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value);
}

function formatScalarValue(key: string, value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "N/A";
    }

    const normalizedKey = key.toLowerCase();
    const isPercent =
      normalizedKey.includes("pct") ||
      normalizedKey.includes("percent") ||
      normalizedKey.includes("confidence");
    const isRatio = normalizedKey.includes("ratio");
    const isDays = normalizedKey.includes("day");
    const isCurrency =
      normalizedKey.includes("amount") ||
      normalizedKey.includes("gst") ||
      normalizedKey.includes("itc") ||
      normalizedKey.includes("cash") ||
      normalizedKey.includes("expense") ||
      normalizedKey.includes("refund") ||
      normalizedKey.includes("burn") ||
      normalizedKey.includes("payable");

    if (isCurrency) {
      return formatInr(value, { maximumFractionDigits: 2 });
    }

    if (isPercent) {
      const base = value <= 1 ? value * 100 : value;
      return `${base.toFixed(1)}%`;
    }

    if (isRatio) {
      return `${value.toFixed(2)}x`;
    }

    if (isDays) {
      return `${value.toFixed(1)} day(s)`;
    }

    return value.toLocaleString("en-IN", {
      maximumFractionDigits: 2
    });
  }

  if (typeof value === "string") {
    if (isDateString(value)) {
      return formatDateTime(value);
    }

    return value;
  }

  if (value === null || value === undefined) {
    return "N/A";
  }

  return String(value);
}

function buildWhyRows(metaPayload: Record<string, unknown> | null): WhyRow[] {
  if (!metaPayload) {
    return [];
  }

  const rows: WhyRow[] = [];
  const seen = new Set<string>();
  const why = toRecord(metaPayload.why);

  if (why) {
    for (const [key, value] of Object.entries(why)) {
      if (value === null || value === undefined || typeof value === "object") {
        continue;
      }

      seen.add(key);
      rows.push({
        label: toLabel(key),
        value: formatScalarValue(key, value)
      });
    }
  }

  for (const key of KEY_ORDER) {
    if (seen.has(key)) {
      continue;
    }

    if (!(key in metaPayload)) {
      continue;
    }

    const value = metaPayload[key];
    if (value === null || value === undefined || typeof value === "object") {
      continue;
    }

    seen.add(key);
    rows.push({
      label: toLabel(key),
      value: formatScalarValue(key, value)
    });
  }

  if (rows.length >= 6) {
    return rows.slice(0, 10);
  }

  for (const [key, value] of Object.entries(metaPayload)) {
    if (seen.has(key) || key === "fixAction" || key === "resolution") {
      continue;
    }

    if (value === null || value === undefined || typeof value === "object") {
      continue;
    }

    rows.push({
      label: toLabel(key),
      value: formatScalarValue(key, value)
    });

    if (rows.length >= 10) {
      break;
    }
  }

  return rows;
}

function buildLedgerHref(alert: AlertItem, scopeQuery: string): string {
  const params = new URLSearchParams(scopeQuery);
  params.set("panel", "issues");
  params.set("alert", String(alert.id));

  const impactedIds = getAffectedIds(alert);
  if (impactedIds.length > 0) {
    params.set("ids", impactedIds.join(","));
    params.set("txn", String(impactedIds[0]));
  }

  const payload = getMetaPayload(alert);
  const mappedPreset = mapAlertTypeToPreset(alert.type);
  const fixAction = parseFixAction(payload);

  if (mappedPreset) {
    params.set("preset", mappedPreset);
  } else if (fixAction?.kind === "open_filter" && fixAction.preset) {
    params.set("preset", fixAction.preset);
  }

  if (fixAction?.kind === "open_recon" && fixAction.recon) {
    params.set("recon", fixAction.recon);
  }

  return `/app/ledger?${params.toString()}`;
}

export function AlertsWorkbench() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const scoped = useMemo(
    () => toScope(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const scopeQuery = scoped.scopeQuery;
  const scopeBody = scoped.scopeBody;

  const [status, setStatus] = useState<AlertStatusFilter>("open");
  const [severity, setSeverity] = useState<AlertSeverityFilter>("all");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]>("all");
  const [page, setPage] = useState(1);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const alertsQuery = useQuery({
    queryKey: ["alerts", "workbench", scopeQuery, status, severity, type, page],
    queryFn: async () => {
      const params = new URLSearchParams(scopeQuery);
      params.set("status", status);
      params.set("page", String(page));
      params.set("limit", "20");
      if (severity !== "all") {
        params.set("severity", severity);
      }
      if (type !== "all") {
        params.set("type", type);
      }

      const response = await fetchWithTimeout(`/api/alerts?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to load alerts"));
      }

      return (await response.json()) as AlertsResponse;
    },
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  useEffect(() => {
    const rows = alertsQuery.data?.alerts ?? [];
    if (rows.length === 0) {
      setSelectedAlertId(null);
      return;
    }

    if (selectedAlertId === null) {
      setSelectedAlertId(rows[0].id);
      return;
    }

    const stillExists = rows.some((row) => row.id === selectedAlertId);
    if (!stillExists) {
      setSelectedAlertId(rows[0].id);
    }
  }, [alertsQuery.data, selectedAlertId]);

  const actionMutation = useMutation({
    mutationFn: async (input: ActionInput) => {
      const response = await fetchWithTimeout(`/api/alerts/${input.alertId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          action: input.action,
          keepTransactionId: input.keepTransactionId
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to apply alert action"));
      }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setFeedback(`Action applied: ${variables.action}`);
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Alert action failed");
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await fetchWithTimeout(`/api/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          note: "Resolved from alerts workbench"
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to resolve alert"));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setFeedback("Alert resolved.");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Resolve failed");
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams(scopeQuery);
      params.set("status", status);
      params.set("page", "1");
      params.set("limit", "20");
      params.set("refresh", "true");
      if (severity !== "all") {
        params.set("severity", severity);
      }
      if (type !== "all") {
        params.set("type", type);
      }

      const response = await fetchWithTimeout(`/api/alerts?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to refresh alerts"));
      }

      return (await response.json()) as AlertsResponse;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["alerts", "workbench", scopeQuery, status, severity, type, 1], data);
      setPage(1);
      setFeedback("Alert engine refreshed.");
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Refresh failed");
    }
  });

  const alerts = alertsQuery.data?.alerts ?? [];
  const pagination = alertsQuery.data;
  const selectedAlert = alerts.find((row) => row.id === selectedAlertId) ?? null;
  const selectedPayload = getMetaPayload(selectedAlert);
  const whyRows = useMemo(() => buildWhyRows(selectedPayload), [selectedPayload]);
  const payloadPretty = toPrettyJson(selectedPayload);

  const pageSummary = useMemo(() => {
    if (!pagination) {
      return "";
    }

    if (pagination.total === 0) {
      return "No alerts in this view";
    }

    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.total, start + pagination.alerts.length - 1);
    return `${start}-${end} of ${pagination.total}`;
  }, [pagination]);

  const canPrev = Boolean(pagination && pagination.page > 1);
  const canNext = Boolean(pagination && pagination.page < pagination.totalPages);
  const queryErrorMessage =
    alertsQuery.error instanceof Error ? alertsQuery.error.message : "Failed to load alerts";

  return (
    <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-white/12 bg-black/55 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Alerts</p>
            <h1 className="mt-1 text-xl font-semibold text-zinc-100">Monitoring + Resolution Queue</h1>
            <p className="mt-1 text-xs text-zinc-400">
              List, resolve, and run alert actions with direct links to impacted ledger rows.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="ui-button inline-flex items-center gap-2 px-3 py-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            {refreshMutation.isPending ? "Refreshing..." : "Refresh rules"}
          </button>
        </header>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <label className="text-xs text-zinc-400">
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AlertStatusFilter);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-2 py-2 text-xs text-zinc-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            Severity
            <select
              value={severity}
              onChange={(event) => {
                setSeverity(event.target.value as AlertSeverityFilter);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-2 py-2 text-xs text-zinc-100"
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            Type
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as (typeof TYPE_OPTIONS)[number]);
                setPage(1);
              }}
              className="mt-1 w-full rounded-lg border border-white/12 bg-black/40 px-2 py-2 text-xs text-zinc-100"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All types" : option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {alertsQuery.isLoading ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/35 px-3 py-4 text-xs text-zinc-400">
            Loading alerts...
          </div>
        ) : alertsQuery.isError ? (
          <div className="mt-4">
            <ErrorState
              message={queryErrorMessage}
              onRetry={() => {
                setFeedback(null);
                void alertsQuery.refetch();
              }}
            />
          </div>
        ) : alerts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/35 px-4 py-5 text-center">
            <p className="text-sm font-medium text-zinc-100">No alerts right now</p>
            <p className="mt-1 text-xs text-zinc-400">
              Run checks to recompute GST, ITC, reconciliation, and anomaly signals.
            </p>
            <button
              type="button"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="mt-3 rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
            >
              {refreshMutation.isPending ? "Running checks..." : "Run checks"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {alerts.map((alert) => {
              const impactedIds = getAffectedIds(alert);
              const selected = selectedAlertId === alert.id;
              const severityClass =
                alert.severity === "critical"
                  ? "text-red-300"
                  : alert.severity === "warning"
                    ? "text-amber-300"
                    : "text-zinc-300";

              return (
                <article
                  key={alert.id}
                  className={`rounded-xl border p-3 ${
                    selected
                      ? "border-white/30 bg-white/[0.08]"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedAlertId(alert.id)}
                    className="w-full text-left"
                  >
                    <p className={`text-[11px] uppercase tracking-wide ${severityClass}`}>
                      {alert.severity} • {alert.type.replace(/_/g, " ")} • {formatRelativeTime(alert.created_at)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-100">
                      {alert.title ?? alert.message}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">{alert.body ?? alert.message}</p>
                  </button>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={buildLedgerHref(alert, scopeQuery)}
                      className="rounded-md border border-white/16 bg-white/6 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/10"
                    >
                      Jump to affected transactions ({impactedIds.length})
                    </Link>

                    {alert.status !== "resolved" ? (
                      <button
                        type="button"
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        className="rounded-md border border-white/16 bg-white/6 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/10 disabled:opacity-60"
                      >
                        Resolve
                      </button>
                    ) : null}

                    {alert.type === "duplicate" && alert.status !== "resolved" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const keepTransactionId = alert.transaction_id ?? getAffectedIds(alert)[0];
                            actionMutation.mutate({
                              alertId: alert.id,
                              action: "merge",
                              keepTransactionId: keepTransactionId ?? undefined
                            });
                          }}
                          disabled={actionMutation.isPending}
                          className="rounded-md border border-white/16 bg-white/6 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/10 disabled:opacity-60"
                        >
                          Merge
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            actionMutation.mutate({
                              alertId: alert.id,
                              action: "ignore"
                            })
                          }
                          disabled={actionMutation.isPending}
                          className="rounded-md border border-white/16 bg-white/6 px-2 py-1 text-[11px] text-zinc-200 hover:bg-white/10 disabled:opacity-60"
                        >
                          Ignore
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="mt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-500">{pageSummary}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={!canPrev}
              className="rounded-md border border-white/16 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => value + 1)}
              disabled={!canNext}
              className="rounded-md border border-white/16 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      <aside className="rounded-2xl border border-white/12 bg-black/55 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Why this alert</h2>
        {!selectedAlert ? (
          <p className="mt-2 text-xs text-zinc-400">Select an alert to inspect details.</p>
        ) : (
          <>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {selectedAlert.type.replace(/_/g, " ")} • {selectedAlert.severity}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-100">
                {selectedAlert.title ?? selectedAlert.message}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{selectedAlert.body ?? selectedAlert.message}</p>
              <p className="mt-2 text-[11px] text-zinc-500">
                Opened: {formatDateTime(selectedAlert.created_at)}
              </p>
              {selectedAlert.resolved_at ? (
                <p className="text-[11px] text-zinc-500">
                  Resolved: {formatDateTime(selectedAlert.resolved_at)}
                </p>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Meta payload details</p>
              {whyRows.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-zinc-200">
                  {whyRows.map((row) => (
                    <li key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-3">
                      <span className="text-zinc-400">{row.label}</span>
                      <span className="text-right text-zinc-100">{row.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-zinc-400">No structured details found in payload metadata.</p>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <Link
                href={buildLedgerHref(selectedAlert, scopeQuery)}
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12"
              >
                Jump to affected transactions
              </Link>

              {selectedAlert.status !== "resolved" ? (
                <button
                  type="button"
                  onClick={() => resolveMutation.mutate(selectedAlert.id)}
                  disabled={resolveMutation.isPending}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
                >
                  Resolve alert
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    actionMutation.mutate({
                      alertId: selectedAlert.id,
                      action: "reopen"
                    })
                  }
                  disabled={actionMutation.isPending}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
                >
                  Reopen alert
                </button>
              )}

              {selectedAlert.status === "open" ? (
                <button
                  type="button"
                  onClick={() =>
                    actionMutation.mutate({
                      alertId: selectedAlert.id,
                      action: "snooze"
                    })
                  }
                  disabled={actionMutation.isPending}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
                >
                  Snooze alert
                </button>
              ) : null}

              {selectedAlert.action_url ? (
                <a
                  href={selectedAlert.action_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12"
                >
                  Open action URL
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>

            {payloadPretty ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Raw payload</p>
                <pre className="mt-2 max-h-52 overflow-auto rounded bg-black/50 p-2 text-[11px] text-zinc-300">
                  {payloadPretty}
                </pre>
              </div>
            ) : null}
          </>
        )}

        {feedback ? (
          <p className="mt-3 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-zinc-200">
            {feedback}
          </p>
        ) : null}
      </aside>
    </section>
  );
}
