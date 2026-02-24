"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatInr } from "@/lib/formatters";

type AlertItem = {
  id: number;
  type:
    | "gst_due"
    | "itc_available"
    | "vendor_mismatch_risk"
    | "cash_runway"
    | "expense_spike_anomaly"
    | "refund_spike"
    | "reconciliation_gap"
    | "cash_runway_risk"
    | "sync_failure"
    | "anomaly_detected"
    | "itc_mismatch"
    | "unmatched"
    | "duplicate";
  severity: "critical" | "warning" | "info";
  status: "open" | "snoozed" | "resolved";
  title: string | null;
  body: string | null;
  message: string;
  transaction_id: number | null;
  related_transaction_ids: unknown;
  payload?: Record<string, unknown> | null;
  created_at: string;
};

type AlertsResponse = {
  alerts?: AlertItem[];
};

type TransactionDetails = {
  id: number;
  occurred_at?: string;
  description?: string | null;
  counterparty?: string | null;
  direction?: "credit" | "debit";
  amount_minor?: string;
  status?: "pending" | "posted" | "reversed";
  source?: string;
  category_id?: number | null;
  metadata?: Record<string, unknown>;
};

type TransactionDetailResponse = {
  transaction?: TransactionDetails;
};

type AuditLogItem = {
  id: number;
  actor_type: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
};

type AuditLogResponse = {
  logs?: AuditLogItem[];
};

type PanelTab = "issues" | "details" | "assistant" | "audit";

type ScopeBody = {
  workspaceId?: string;
  businessId?: number;
};

type DuplicateActionInput = {
  alertId: number;
  action: "merge" | "ignore";
  keepTransactionId?: number;
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

function parseTransactionIds(value: string | null): number[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function parseRelatedIds(raw: unknown): number[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw
      .map((value) => (typeof value === "number" ? value : Number.parseInt(String(value), 10)))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => (typeof value === "number" ? value : Number.parseInt(String(value), 10)))
          .filter((id) => Number.isInteger(id) && id > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function mapAlertTypeToPreset(type: AlertItem["type"]): string | null {
  if (type === "itc_mismatch" || type === "itc_available") {
    return "itc_mismatch";
  }

  if (type === "gst_due") {
    return "gst_due";
  }

  if (
    type === "unmatched" ||
    type === "vendor_mismatch_risk" ||
    type === "reconciliation_gap"
  ) {
    return "unmatched";
  }

  return null;
}

type FixAction = {
  label: string;
  kind: "open_filter" | "open_recon";
  preset?: string;
  recon?: string;
};

function parseFixAction(payload: unknown): FixAction | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const payloadRecord = payload as Record<string, unknown>;
  const fixActionRaw = payloadRecord.fixAction;
  if (!fixActionRaw || typeof fixActionRaw !== "object" || Array.isArray(fixActionRaw)) {
    return null;
  }

  const fixAction = fixActionRaw as Record<string, unknown>;
  const kindRaw = typeof fixAction.kind === "string" ? fixAction.kind : "";
  if (kindRaw !== "open_filter" && kindRaw !== "open_recon") {
    return null;
  }

  const label =
    typeof fixAction.label === "string" && fixAction.label.trim()
      ? fixAction.label.trim()
      : "Fix";

  const parsed: FixAction = {
    label,
    kind: kindRaw
  };

  if (typeof fixAction.preset === "string" && fixAction.preset.trim()) {
    parsed.preset = fixAction.preset.trim();
  }

  if (typeof fixAction.recon === "string" && fixAction.recon.trim()) {
    parsed.recon = fixAction.recon.trim();
  }

  return parsed;
}

function toScope(searchParams: URLSearchParams): {
  scopeQuery: string;
  scopeBody: ScopeBody;
} {
  const workspaceId = searchParams.get("workspaceId");
  const businessId = searchParams.get("businessId") ?? "1";

  if (workspaceId) {
    return {
      scopeQuery: `workspaceId=${encodeURIComponent(workspaceId)}`,
      scopeBody: { workspaceId }
    };
  }

  const businessIdNumber = Number.parseInt(businessId, 10);
  return {
    scopeQuery: `businessId=${encodeURIComponent(businessId)}`,
    scopeBody: { businessId: Number.isInteger(businessIdNumber) && businessIdNumber > 0 ? businessIdNumber : 1 }
  };
}

function formatAmount(raw: string | undefined, direction: string | undefined): string {
  const value = Number(raw ?? "0");
  const normalized = Number.isFinite(value) ? Math.abs(value) : 0;
  const signed = direction === "debit" ? -normalized : normalized;
  return formatInr(signed, { maximumFractionDigits: 2, signed: true });
}

function parseEvidence(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) {
    return [];
  }

  const candidates = [metadata.attachments, metadata.evidence, metadata.proofs];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (Array.isArray(candidate)) {
      const parsed = candidate
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item && typeof item === "object") {
            const record = item as Record<string, unknown>;
            const name = typeof record.name === "string" ? record.name : null;
            const url = typeof record.url === "string" ? record.url : null;
            return name && url ? `${name} (${url})` : name ?? url ?? null;
          }

          return null;
        })
        .filter((value): value is string => Boolean(value));

      if (parsed.length > 0) {
        return parsed;
      }
    }
  }

  return [];
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

type ReconciliationSuggestion = {
  candidateTransactionId: number | null;
  score: number | null;
  method: string | null;
  dateDiffDays: number | null;
  merchantSimilarity: number | null;
  suggestedGroupId: string | null;
  generatedAt: string | null;
};

function parseReconciliationSuggestion(
  metadata: Record<string, unknown> | undefined
): ReconciliationSuggestion | null {
  if (!metadata) {
    return null;
  }

  const raw = metadata.reconciliationSuggestion;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const candidateTransactionId = Number.parseInt(String(data.candidateTransactionId ?? ""), 10);
  const score = Number(data.score);
  const dateDiffDays = Number(data.dateDiffDays);
  const merchantSimilarity = Number(data.merchantSimilarity);

  return {
    candidateTransactionId:
      Number.isInteger(candidateTransactionId) && candidateTransactionId > 0
        ? candidateTransactionId
        : null,
    score: Number.isFinite(score) ? score : null,
    method: typeof data.method === "string" ? data.method : null,
    dateDiffDays: Number.isFinite(dateDiffDays) ? dateDiffDays : null,
    merchantSimilarity: Number.isFinite(merchantSimilarity) ? merchantSimilarity : null,
    suggestedGroupId: typeof data.suggestedGroupId === "string" ? data.suggestedGroupId : null,
    generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : null
  };
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

export function RightPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [assistantMessage, setAssistantMessage] = useState<string>("");

  const tab = (searchParams.get("panel") as PanelTab | null) ?? "issues";
  const selectedTransactionId = Number.parseInt(searchParams.get("txn") ?? "", 10);
  const selectedAlertId = Number.parseInt(searchParams.get("alert") ?? "", 10);
  const scoped = useMemo(() => toScope(new URLSearchParams(searchParams.toString())), [searchParams]);
  const scopedQuery = scoped.scopeQuery;
  const scopeBody = scoped.scopeBody;

  function notifyLedgerRefresh() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ledger:refresh"));
    }
  }

  const alertsQuery = useQuery({
    queryKey: ["alerts", scopedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/alerts?${scopedQuery}&status=open&page=1&limit=50`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to load alerts"));
      }

      const data = (await response.json()) as AlertsResponse;
      return data.alerts ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  const refreshAlertsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/alerts?${scopedQuery}&status=open&page=1&limit=50&refresh=true`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to refresh alert engine"));
      }

      const data = (await response.json()) as AlertsResponse;
      return data.alerts ?? [];
    },
    onSuccess: (alerts) => {
      queryClient.setQueryData(["alerts", scopedQuery], alerts);
      setAssistantMessage("Alert rules refreshed.");
    },
    onError: (error) => {
      setAssistantMessage(error instanceof Error ? error.message : "Alert refresh failed");
    }
  });

  const detailsQuery = useQuery({
    queryKey: ["transaction", "details", scopedQuery, selectedTransactionId],
    enabled: Number.isInteger(selectedTransactionId) && selectedTransactionId > 0,
    queryFn: async () => {
      const response = await fetch(
        `/api/transactions/${selectedTransactionId}?${scopedQuery}&includeDeleted=true`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to load transaction details"));
      }

      const data = (await response.json()) as TransactionDetailResponse;
      return data.transaction ?? null;
    }
  });

  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", scopedQuery, selectedTransactionId],
    queryFn: async () => {
      const params = new URLSearchParams(scopedQuery);
      params.set("entityType", "transaction");
      params.set("limit", "20");
      if (Number.isInteger(selectedTransactionId) && selectedTransactionId > 0) {
        params.set("entityId", String(selectedTransactionId));
      }

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to load audit logs"));
      }

      const data = (await response.json()) as AuditLogResponse;
      return data.logs ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async () => {
      if (!Number.isInteger(selectedAlertId) || selectedAlertId <= 0) {
        throw new Error("Select an alert first");
      }

      const response = await fetch(`/api/alerts/${selectedAlertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          note: "Resolved from assistant panel"
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to resolve alert"));
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] })
      ]);
      notifyLedgerRefresh();
      setAssistantMessage("Alert resolved.");
    },
    onError: (error) => {
      setAssistantMessage(error instanceof Error ? error.message : "Resolve failed");
    }
  });

  const runMatchMutation = useMutation({
    mutationFn: async () => {
      const impactedIds = parseTransactionIds(searchParams.get("ids"));
      const fallbackId =
        Number.isInteger(selectedTransactionId) && selectedTransactionId > 0
          ? [selectedTransactionId]
          : [];
      const transactionIds = [...new Set([...impactedIds, ...fallbackId])];

      if (transactionIds.length === 0) {
        throw new Error("No impacted rows selected");
      }

      const response = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          action: "match",
          transactionIds,
          confidence: 0.9
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to run match action"));
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] })
      ]);
      notifyLedgerRefresh();
      setAssistantMessage("Match action triggered.");
    },
    onError: (error) => {
      setAssistantMessage(error instanceof Error ? error.message : "Match action failed");
    }
  });

  const triggerSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          provider: "razorpay"
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to trigger sync"));
      }
    },
    onSuccess: () => {
      setAssistantMessage("Sync trigger sent.");
    },
    onError: (error) => {
      setAssistantMessage(error instanceof Error ? error.message : "Sync trigger failed");
    }
  });

  const runRulesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/rules/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          limit: 1500,
          confidenceThreshold: 0.65
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to run rules engine"));
      }

      const payload = (await response.json()) as {
        result?: { duplicateSuggestionsOpen?: number; tagged?: number; scanned?: number };
      };
      return payload.result;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] })
      ]);
      notifyLedgerRefresh();
      setAssistantMessage(
        `Rules applied. Tagged ${result?.tagged ?? 0}/${result?.scanned ?? 0}; auto-clean suggestions open: ${result?.duplicateSuggestionsOpen ?? 0}.`
      );
    },
    onError: (error) => {
      setAssistantMessage(error instanceof Error ? error.message : "Rules engine failed");
    }
  });

  const duplicateActionMutation = useMutation({
    mutationFn: async (input: DuplicateActionInput) => {
      const response = await fetch(`/api/alerts/${input.alertId}/action`, {
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
        throw new Error(parseErrorMessage(payload, "Failed to apply duplicate action"));
      }
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] })
      ]);
      notifyLedgerRefresh();
      setAssistantMessage(
        variables.action === "merge"
          ? "Duplicate suggestion merged and resolved."
          : "Duplicate suggestion ignored and resolved."
      );
    },
    onError: (error) => {
      setAssistantMessage(error instanceof Error ? error.message : "Duplicate action failed");
    }
  });

  function updateParams(mutator: (params: URLSearchParams) => void, forceTransactionsPage = false) {
    const next = new URLSearchParams(searchParams.toString());
    mutator(next);
    const query = next.toString();
    const targetPath = forceTransactionsPage ? "/ledger" : pathname;
    router.replace(query ? `${targetPath}?${query}` : targetPath, { scroll: false });
  }

  function setTab(nextTab: PanelTab) {
    updateParams((params) => {
      params.set("panel", nextTab);
    });
  }

  function handleAlertClick(alert: AlertItem) {
    const relatedIds = parseRelatedIds(alert.related_transaction_ids);
    const impactedIds = [
      ...(alert.transaction_id ? [alert.transaction_id] : []),
      ...relatedIds
    ].filter((id, idx, arr) => arr.indexOf(id) === idx);

    const mappedPreset = mapAlertTypeToPreset(alert.type);
    const fixAction = parseFixAction(alert.payload);

    updateParams(
      (params) => {
        params.set("panel", "issues");
        params.set("alert", String(alert.id));

        if (mappedPreset) {
          params.set("preset", mappedPreset);
        } else if (fixAction?.kind === "open_filter" && fixAction.preset) {
          params.set("preset", fixAction.preset);
        }

        if (fixAction?.kind === "open_recon" && fixAction.recon) {
          params.set("recon", fixAction.recon);
        }

        if (impactedIds.length > 0) {
          params.set("ids", impactedIds.join(","));
          params.set("txn", String(impactedIds[0]));
        } else {
          params.delete("ids");
        }
      },
      true
    );
  }

  function handleFixAction(alert: AlertItem) {
    const action = parseFixAction(alert.payload);
    if (!action) {
      handleAlertClick(alert);
      return;
    }

    const relatedIds = parseRelatedIds(alert.related_transaction_ids);
    const impactedIds = [
      ...(alert.transaction_id ? [alert.transaction_id] : []),
      ...relatedIds
    ].filter((id, idx, arr) => arr.indexOf(id) === idx);

    updateParams(
      (params) => {
        params.set("panel", "issues");
        params.set("alert", String(alert.id));

        if (action.kind === "open_filter" && action.preset) {
          params.set("preset", action.preset);
        }

        if (action.kind === "open_recon" && action.recon) {
          params.set("recon", action.recon);
        }

        if (impactedIds.length > 0) {
          params.set("ids", impactedIds.join(","));
          params.set("txn", String(impactedIds[0]));
        }
      },
      true
    );
  }

  const detailsTransaction = detailsQuery.data ?? null;
  const attachments = parseEvidence(detailsTransaction?.metadata);
  const reconciliationSuggestion = parseReconciliationSuggestion(detailsTransaction?.metadata);
  const rawImportPayload =
    detailsTransaction?.metadata && typeof detailsTransaction.metadata === "object"
      ? (detailsTransaction.metadata.raw ?? null)
      : null;
  const rawImportPayloadPretty = toPrettyJson(rawImportPayload);
  const detailsAuditTrail = (auditLogsQuery.data ?? []).slice(0, 5);
  const duplicateAlerts = (alertsQuery.data ?? []).filter((alert) => alert.type === "duplicate");

  return (
    <aside className="hidden border-l border-zinc-200/70 bg-white/80 p-4 backdrop-blur-xl xl:block">
      <div className="rounded-2xl border border-zinc-200/80 bg-white/85 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Operations Panel</h2>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setTab("issues")}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium ${
            tab === "issues" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
          }`}
        >
          Issues
        </button>
        <button
          type="button"
          onClick={() => setTab("details")}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium ${
            tab === "details" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setTab("assistant")}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium ${
            tab === "assistant" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
          }`}
        >
          Assistant
        </button>
        <button
          type="button"
          onClick={() => setTab("audit")}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium ${
            tab === "audit" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
          }`}
        >
          Audit
        </button>
      </div>

      {tab === "issues" ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              Click an alert to filter ledger to impacted transaction rows.
            </p>
            <button
              type="button"
              onClick={() => refreshAlertsMutation.mutate()}
              disabled={refreshAlertsMutation.isPending}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
            >
              {refreshAlertsMutation.isPending ? "Refreshing..." : "Refresh rules"}
            </button>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Auto-clean suggestions ({duplicateAlerts.length})
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Duplicate suggestions can be resolved with Merge or Ignore.
            </p>
          </div>
          {alertsQuery.isLoading ? (
            <p className="text-xs text-zinc-500">Loading alerts...</p>
          ) : alertsQuery.isError ? (
            <p className="text-xs text-zinc-700">
              {alertsQuery.error instanceof Error ? alertsQuery.error.message : "Failed to load alerts"}
            </p>
          ) : alertsQuery.data && alertsQuery.data.length > 0 ? (
            alertsQuery.data.map((alert) => (
              <div
                key={alert.id}
                className={`w-full rounded-xl border p-3 text-left transition hover:bg-zinc-50 ${
                  selectedAlertId === alert.id
                    ? "border-zinc-900 bg-zinc-50 shadow-sm"
                    : "border-zinc-200"
                }`}
              >
                <button type="button" onClick={() => handleAlertClick(alert)} className="w-full text-left">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {alert.severity} • {alert.type}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">
                    {alert.title ?? alert.message}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">{alert.body ?? alert.message}</p>
                </button>
                {alert.type !== "duplicate" ? (
                  (() => {
                    const fixAction = parseFixAction(alert.payload);
                    if (!fixAction) {
                      return null;
                    }

                    return (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleFixAction(alert)}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100"
                        >
                          {fixAction.label}
                        </button>
                      </div>
                    );
                  })()
                ) : null}
                {alert.type === "duplicate" ? (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const relatedIds = parseRelatedIds(alert.related_transaction_ids);
                        const keepTransactionId =
                          alert.transaction_id && alert.transaction_id > 0
                            ? alert.transaction_id
                            : relatedIds[0];

                        duplicateActionMutation.mutate({
                          alertId: alert.id,
                          action: "merge",
                          keepTransactionId
                        });
                      }}
                      disabled={
                        duplicateActionMutation.isPending &&
                        duplicateActionMutation.variables?.alertId === alert.id
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                    >
                      Merge
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        duplicateActionMutation.mutate({
                          alertId: alert.id,
                          action: "ignore"
                        });
                      }}
                      disabled={
                        duplicateActionMutation.isPending &&
                        duplicateActionMutation.variables?.alertId === alert.id
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                    >
                      Ignore
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500">No open alerts.</p>
          )}
        </div>
      ) : null}

      {tab === "details" ? (
        <div className="mt-4 space-y-3">
          {!Number.isInteger(selectedTransactionId) || selectedTransactionId <= 0 ? (
            <p className="text-xs text-zinc-500">
              Select a ledger row to view transaction details and evidence.
            </p>
          ) : detailsQuery.isLoading ? (
            <p className="text-xs text-zinc-500">Loading transaction details...</p>
          ) : detailsQuery.isError ? (
            <p className="text-xs text-zinc-700">
              {detailsQuery.error instanceof Error ? detailsQuery.error.message : "Failed to load details"}
            </p>
          ) : detailsTransaction ? (
            <>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Transaction</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">#{detailsTransaction.id}</p>
                <p className="mt-1 text-xs text-zinc-700">
                  {detailsTransaction.description ?? detailsTransaction.counterparty ?? "No description"}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {detailsTransaction.occurred_at?.slice(0, 10) ?? "NA"} •{" "}
                  {formatAmount(detailsTransaction.amount_minor, detailsTransaction.direction)} •{" "}
                  {detailsTransaction.source ?? "manual"}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Reconciliation Suggestion
                </p>
                {reconciliationSuggestion ? (
                  <div className="mt-2 space-y-1 text-xs text-zinc-700">
                    <p>
                      Candidate row:{" "}
                      {reconciliationSuggestion.candidateTransactionId
                        ? `#${reconciliationSuggestion.candidateTransactionId}`
                        : "N/A"}
                    </p>
                    <p>
                      Confidence:{" "}
                      {reconciliationSuggestion.score !== null
                        ? `${Math.round(reconciliationSuggestion.score * 100)}%`
                        : "N/A"}
                    </p>
                    <p>Method: {reconciliationSuggestion.method ?? "N/A"}</p>
                    <p>
                      Date difference:{" "}
                      {reconciliationSuggestion.dateDiffDays !== null
                        ? `${reconciliationSuggestion.dateDiffDays.toFixed(2)} day(s)`
                        : "N/A"}
                    </p>
                    <p>
                      Merchant similarity:{" "}
                      {reconciliationSuggestion.merchantSimilarity !== null
                        ? `${Math.round(reconciliationSuggestion.merchantSimilarity * 100)}%`
                        : "N/A"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">No reconciliation suggestion on this row.</p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Evidence Attachments</p>
                {attachments.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                    {attachments.map((attachment) => (
                      <li key={attachment} className="rounded bg-zinc-50 px-2 py-1">
                        {attachment}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">No attachments on this transaction yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Raw Import Row</p>
                {rawImportPayloadPretty ? (
                  <pre className="mt-2 max-h-52 overflow-auto rounded bg-zinc-50 p-2 text-[11px] text-zinc-700">
                    {rawImportPayloadPretty}
                  </pre>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">No raw import payload found on this transaction.</p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Audit Trail</p>
                {auditLogsQuery.isLoading ? (
                  <p className="mt-2 text-xs text-zinc-500">Loading audit trail...</p>
                ) : auditLogsQuery.isError ? (
                  <p className="mt-2 text-xs text-zinc-700">
                    {auditLogsQuery.error instanceof Error
                      ? auditLogsQuery.error.message
                      : "Failed to load audit trail"}
                  </p>
                ) : detailsAuditTrail.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-xs text-zinc-700">
                    {detailsAuditTrail.map((log) => (
                      <li key={`${log.id}-${log.created_at}`} className="rounded bg-zinc-50 px-2 py-1">
                        <p className="font-medium text-zinc-800">
                          {log.actor_type === "user" ? "You" : log.actor_type} • {formatRelativeTime(log.created_at)}
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          {log.action} • {log.entity_type} #{log.entity_id}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">No audit events for this row yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500">Transaction not found.</p>
          )}
        </div>
      ) : null}

      {tab === "assistant" ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-zinc-500">
            Rule actions call backend endpoints for categorization and auto-clean.
          </p>
          <button
            type="button"
            onClick={() => runRulesMutation.mutate()}
            disabled={runRulesMutation.isPending}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Run Rules Engine v0
          </button>
          <button
            type="button"
            onClick={() => runMatchMutation.mutate()}
            disabled={runMatchMutation.isPending}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Re-run Match on Impacted Rows
          </button>
          <button
            type="button"
            onClick={() => resolveAlertMutation.mutate()}
            disabled={resolveAlertMutation.isPending}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Resolve Selected Alert
          </button>
          <button
            type="button"
            onClick={() => triggerSyncMutation.mutate()}
            disabled={triggerSyncMutation.isPending}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Trigger Data Sync (Stub)
          </button>
          {assistantMessage ? (
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs text-zinc-700">
              {assistantMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-zinc-500">
            Immutable change feed for this ledger scope.
          </p>
          {auditLogsQuery.isLoading ? (
            <p className="text-xs text-zinc-500">Loading audit logs...</p>
          ) : auditLogsQuery.isError ? (
            <p className="text-xs text-zinc-700">
              {auditLogsQuery.error instanceof Error
                ? auditLogsQuery.error.message
                : "Failed to load audit logs"}
            </p>
          ) : auditLogsQuery.data && auditLogsQuery.data.length > 0 ? (
            <div className="space-y-2">
              {auditLogsQuery.data.map((log) => (
                <article
                  key={`${log.id}-${log.created_at}`}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <p className="text-xs font-medium text-zinc-800">
                    Changed by {log.actor_type === "user" ? "you" : log.actor_type} •{" "}
                    {formatRelativeTime(log.created_at)}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {log.action} • {log.entity_type} #{log.entity_id}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No audit entries yet for this selection.</p>
          )}
        </div>
      ) : null}
      </div>
    </aside>
  );
}
