"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Filter,
  RefreshCw,
  Search
} from "lucide-react";
import { formatInr } from "@/lib/formatters";

type ReconMode = "attention" | "needs_review" | "unmatched" | "all";

type ApiTransaction = {
  id: number;
  occurred_at: string;
  description: string | null;
  counterparty: string | null;
  direction: "credit" | "debit";
  amount: string;
  source: string;
  status: "pending" | "posted" | "reversed";
  matched: boolean;
  confidence: string | null;
  match_group_id: string | null;
  metadata?: Record<string, unknown>;
};

type TransactionsResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  transactions: ApiTransaction[];
};

type HealthMetrics = {
  recon_match_pct: number;
  compliance_confidence: number;
  month_close_readiness_pct: number;
};

type SuggestionMeta = {
  candidateTransactionId: number | null;
  score: number | null;
  dateDiffDays: number | null;
  merchantSimilarity: number | null;
  method: string | null;
  generatedAt: string | null;
};

type PriorityLevel = "critical" | "warning" | "info";

type Priority = {
  level: PriorityLevel;
  score: number;
  reasons: string[];
};

type ReconRow = {
  id: number;
  date: string;
  ageDays: number;
  description: string;
  amount: number;
  source: string;
  status: "pending" | "posted" | "reversed";
  matched: boolean;
  confidence: number | null;
  matchGroupId: string | null;
  suggestion: SuggestionMeta;
  priority: Priority;
};

type ScopeInfo = {
  scopeQuery: string;
  scopeBody: {
    workspaceId?: string;
    businessId?: number;
  };
};

const SOURCE_OPTIONS = [
  "all",
  "bank",
  "upi",
  "razorpay",
  "stripe",
  "hdfc",
  "icici",
  "gpay",
  "manual",
  "csv_import"
] as const;

const MODE_OPTIONS: Array<{
  id: ReconMode;
  label: string;
  sub: string;
}> = [
  { id: "attention", label: "Attention", sub: "Prioritized queue" },
  { id: "needs_review", label: "Needs Review", sub: "Confidence 60-95%" },
  { id: "unmatched", label: "Unmatched", sub: "Not yet reconciled" },
  { id: "all", label: "All", sub: "Full ledger view" }
];

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

function isAuthErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("access token") ||
    normalized.includes("session") ||
    normalized.includes("forbidden") ||
    normalized.includes("not authenticated") ||
    normalized.includes("auth")
  );
}

function toScope(searchParams: URLSearchParams): ScopeInfo {
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

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(parsed));
}

function parseSuggestion(metadata: Record<string, unknown> | undefined): SuggestionMeta {
  if (!metadata || typeof metadata !== "object") {
    return {
      candidateTransactionId: null,
      score: null,
      dateDiffDays: null,
      merchantSimilarity: null,
      method: null,
      generatedAt: null
    };
  }

  const raw = metadata.reconciliationSuggestion;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      candidateTransactionId: null,
      score: null,
      dateDiffDays: null,
      merchantSimilarity: null,
      method: null,
      generatedAt: null
    };
  }

  const record = raw as Record<string, unknown>;
  const candidateRaw = Number.parseInt(String(record.candidateTransactionId ?? ""), 10);
  const method = typeof record.method === "string" ? record.method : null;
  const generatedAt = typeof record.generatedAt === "string" ? record.generatedAt : null;

  return {
    candidateTransactionId:
      Number.isInteger(candidateRaw) && candidateRaw > 0 ? candidateRaw : null,
    score: toNumber(record.score),
    dateDiffDays: toNumber(record.dateDiffDays),
    merchantSimilarity: toNumber(record.merchantSimilarity),
    method,
    generatedAt
  };
}

function computePriority(input: {
  amount: number;
  ageDays: number;
  matched: boolean;
  suggestionScore: number | null;
}): Priority {
  if (input.matched) {
    return {
      level: "info",
      score: 0,
      reasons: ["Already matched"]
    };
  }

  let score = 20;
  const reasons: string[] = [];
  const absoluteAmount = Math.abs(input.amount);

  if (absoluteAmount >= 100000) {
    score += 30;
    reasons.push("High value impact");
  } else if (absoluteAmount >= 50000) {
    score += 22;
    reasons.push("Material value impact");
  } else if (absoluteAmount >= 10000) {
    score += 10;
    reasons.push("Meaningful value impact");
  }

  if (input.ageDays >= 14) {
    score += 24;
    reasons.push("Aged > 14 days");
  } else if (input.ageDays >= 7) {
    score += 14;
    reasons.push("Aged > 7 days");
  } else if (input.ageDays >= 3) {
    score += 8;
    reasons.push("Aged > 3 days");
  }

  if (input.suggestionScore === null) {
    score += 16;
    reasons.push("No suggested pair");
  } else if (input.suggestionScore < 0.75) {
    score += 16;
    reasons.push("Low confidence suggestion");
  } else if (input.suggestionScore < 0.9) {
    score += 8;
    reasons.push("Medium confidence suggestion");
  }

  const level: PriorityLevel =
    score >= 65 ? "critical" : score >= 40 ? "warning" : "info";

  if (reasons.length === 0) {
    reasons.push("Standard exception");
  }

  return {
    level,
    score,
    reasons
  };
}

function priorityRank(level: PriorityLevel): number {
  if (level === "critical") {
    return 3;
  }

  if (level === "warning") {
    return 2;
  }

  return 1;
}

function mapTransactionToReconRow(row: ApiTransaction): ReconRow {
  const amountRaw = toNumber(row.amount) ?? 0;
  const amount = Math.abs(amountRaw);
  const dateRaw = row.occurred_at;
  const parsedDate = Date.parse(dateRaw);
  const ageDays = Number.isNaN(parsedDate)
    ? 0
    : Math.max(0, Math.floor((Date.now() - parsedDate) / (1000 * 60 * 60 * 24)));
  const confidence = toNumber(row.confidence);
  const suggestion = parseSuggestion(row.metadata);
  const priority = computePriority({
    amount,
    ageDays,
    matched: row.matched,
    suggestionScore: suggestion.score
  });

  return {
    id: row.id,
    date: dateRaw,
    ageDays,
    description: row.description ?? row.counterparty ?? `Transaction ${row.id}`,
    amount,
    source: row.source,
    status: row.status,
    matched: row.matched,
    confidence,
    matchGroupId: row.match_group_id,
    suggestion,
    priority
  };
}

async function fetchHealth(scopeQuery: string): Promise<HealthMetrics> {
  const response = await fetch(`/api/metrics/health?${scopeQuery}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load reconciliation metrics"));
  }

  const json = (await response.json()) as Partial<HealthMetrics>;
  return {
    recon_match_pct: Number(json.recon_match_pct ?? 0),
    compliance_confidence: Number(json.compliance_confidence ?? 0),
    month_close_readiness_pct: Number(json.month_close_readiness_pct ?? 0)
  };
}

async function fetchTransactions(input: {
  scopeQuery: string;
  mode: ReconMode;
  q: string;
  source: string;
  from: string;
  to: string;
  page: number;
  limit: number;
}): Promise<TransactionsResponse> {
  const params = new URLSearchParams(input.scopeQuery);
  params.set("page", String(input.page));
  params.set("limit", String(input.limit));

  const reconParam =
    input.mode === "needs_review"
      ? "needs_review"
      : input.mode === "unmatched" || input.mode === "attention"
        ? "unmatched"
        : "all";
  params.set("recon", reconParam);

  if (input.q.trim()) {
    params.set("q", input.q.trim());
  }

  if (input.source !== "all") {
    params.set("source", input.source);
  }

  if (input.from) {
    params.set("from", input.from);
  }

  if (input.to) {
    params.set("to", input.to);
  }

  const response = await fetch(`/api/transactions?${params.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, "Failed to load reconciliation rows"));
  }

  const json = (await response.json()) as TransactionsResponse;
  return {
    page: json.page ?? 1,
    pageSize: json.pageSize ?? input.limit,
    total: json.total ?? 0,
    totalPages: json.totalPages ?? 0,
    transactions: Array.isArray(json.transactions) ? json.transactions : []
  };
}

function priorityTone(level: PriorityLevel): string {
  if (level === "critical") {
    return "border-zinc-800 bg-zinc-800 text-white";
  }

  if (level === "warning") {
    return "border-zinc-400 bg-zinc-300 text-zinc-900";
  }

  return "border-zinc-300 bg-zinc-100 text-zinc-700";
}

export function ReconciliationWorkbench() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const scoped = useMemo(
    () => toScope(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const [mode, setMode] = useState<ReconMode>("attention");
  const [source, setSource] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [authBlocked, setAuthBlocked] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQ((current) => (current === draftQ ? current : draftQ));
      setPage(1);
    }, 240);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [draftQ]);

  const transactionsQuery = useQuery({
    queryKey: [
      "reconciliation",
      "rows",
      scoped.scopeQuery,
      mode,
      source,
      from,
      to,
      q,
      page,
      limit
    ],
    queryFn: () =>
      fetchTransactions({
        scopeQuery: scoped.scopeQuery,
        mode,
        q,
        source,
        from,
        to,
        page,
        limit
      }),
    enabled: !authBlocked,
    placeholderData: keepPreviousData,
    staleTime: 15_000
  });

  const attentionQuery = useQuery({
    queryKey: [
      "reconciliation",
      "attention",
      scoped.scopeQuery,
      source,
      from,
      to,
      q
    ],
    queryFn: () =>
      fetchTransactions({
        scopeQuery: scoped.scopeQuery,
        mode: "attention",
        q,
        source,
        from,
        to,
        page: 1,
        limit: 120
      }),
    enabled: !authBlocked,
    staleTime: 15_000
  });

  const healthQuery = useQuery({
    queryKey: ["metrics", "health", "reconciliation", scoped.scopeQuery],
    queryFn: () => fetchHealth(scoped.scopeQuery),
    enabled: !authBlocked,
    staleTime: 20_000,
    refetchInterval: 30_000
  });

  const rows = useMemo(
    () =>
      (transactionsQuery.data?.transactions ?? [])
        .map(mapTransactionToReconRow)
        .sort((a, b) => {
          if (mode !== "attention") {
            return b.id - a.id;
          }

          const priorityDelta =
            priorityRank(b.priority.level) - priorityRank(a.priority.level);
          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          if (b.priority.score !== a.priority.score) {
            return b.priority.score - a.priority.score;
          }

          if (b.amount !== a.amount) {
            return b.amount - a.amount;
          }

          return b.id - a.id;
        }),
    [transactionsQuery.data?.transactions, mode]
  );

  const attentionRows = useMemo(
    () =>
      (attentionQuery.data?.transactions ?? [])
        .map(mapTransactionToReconRow)
        .filter((row) => !row.matched)
        .sort((a, b) => {
          const levelDelta = priorityRank(b.priority.level) - priorityRank(a.priority.level);
          if (levelDelta !== 0) {
            return levelDelta;
          }
          if (b.priority.score !== a.priority.score) {
            return b.priority.score - a.priority.score;
          }
          return b.amount - a.amount;
        }),
    [attentionQuery.data?.transactions]
  );

  const queueTop = attentionRows.slice(0, 5);
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[Number(id)]).map((id) => Number(id)),
    [selected]
  );

  const activeRow = useMemo(() => {
    if (!activeId) {
      return rows[0] ?? queueTop[0] ?? null;
    }

    return (
      rows.find((row) => row.id === activeId) ??
      queueTop.find((row) => row.id === activeId) ??
      null
    );
  }, [activeId, queueTop, rows]);

  const unmatchedTotal = attentionQuery.data?.total ?? 0;
  const visibleUnmatchedValue = attentionRows.reduce((sum, row) => sum + row.amount, 0);
  const needsReviewCount = attentionRows.filter(
    (row) =>
      row.suggestion.score !== null &&
      row.suggestion.score >= 0.6 &&
      row.suggestion.score < 0.95
  ).length;
  const criticalCount = attentionRows.filter((row) => row.priority.level === "critical").length;
  const matchPct = Math.max(
    0,
    Math.min(100, Number(healthQuery.data?.recon_match_pct ?? 0))
  );
  const matchedPct = Number(matchPct.toFixed(1));

  const matchMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const response = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scoped.scopeBody,
          action: "match",
          transactionIds,
          confidence: 0.9
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to match transactions"));
      }
    },
    onSuccess: async () => {
      setNotice("Match action completed.");
      setActionError(null);
      setSelected({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reconciliation"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Match action failed");
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const response = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scoped.scopeBody,
          action: "resolve",
          transactionIds,
          note: "Reviewed in reconciliation workbench"
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to mark as reviewed"));
      }
    },
    onSuccess: async () => {
      setNotice("Marked as reviewed.");
      setActionError(null);
      setSelected({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reconciliation"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["alerts"] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Review action failed");
    }
  });

  const refreshSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/transactions/reconcile/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scoped.scopeBody,
          limit: 1000,
          maxDateWindowDays: 3,
          confidenceThreshold: 0.6
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to refresh suggestions"));
      }

      return response.json() as Promise<{ suggestions?: number; scanned?: number }>;
    },
    onSuccess: async (result) => {
      setNotice(
        `Suggestions refreshed (${result.suggestions ?? 0} matches from ${result.scanned ?? 0} scanned).`
      );
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reconciliation"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] })
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Suggestion refresh failed");
    }
  });

  function toggleRow(id: number) {
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  }

  function toggleAllVisible(checked: boolean) {
    if (!checked) {
      setSelected({});
      return;
    }

    const next: Record<number, boolean> = {};
    for (const row of rows) {
      next[row.id] = true;
    }
    setSelected(next);
  }

  const isBusy =
    matchMutation.isPending ||
    reviewMutation.isPending ||
    refreshSuggestionsMutation.isPending;
  const isLoading = transactionsQuery.isPending;
  const loadingError =
    transactionsQuery.error instanceof Error
      ? transactionsQuery.error.message
      : healthQuery.error instanceof Error
        ? healthQuery.error.message
        : attentionQuery.error instanceof Error
          ? attentionQuery.error.message
          : null;

  useEffect(() => {
    if (!loadingError) {
      return;
    }

    if (isAuthErrorMessage(loadingError)) {
      setAuthBlocked(true);
    }
  }, [loadingError]);

  if (authBlocked) {
    return (
      <section className="ui-surface-card p-6" data-reveal="true">
        <p className="ui-label">Authentication Required</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
          Sign in to open reconciliation workbench
        </h2>
        <p className="mt-2 text-sm text-[var(--subtle)]">
          This page enforces workspace-scoped access. Once session is valid, refresh and we will
          load priority queue, matching status, and exception actions.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3" data-reveal="true">
      <article className="ui-panel-dark rounded-[24px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="ui-label">Reconciliation Command Center</p>
            <h2 className="mt-2 text-[clamp(1.8rem,3vw,2.5rem)] font-semibold tracking-tight text-zinc-100">
              Prioritize exceptions. Resolve with confidence.
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Queue is ranked by value impact, aging, and match confidence so operators can make
              the first decision in under 5 seconds.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refreshSuggestionsMutation.mutate()}
            disabled={isBusy}
            className="ui-button inline-flex items-center gap-2 px-3 py-2 text-xs text-zinc-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshSuggestionsMutation.isPending ? "animate-spin" : ""}`} />
            Refresh suggestions
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {MODE_OPTIONS.map((option) => {
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setMode(option.id);
                  setPage(1);
                }}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-white/26 bg-white/18 text-zinc-100"
                    : "border-white/14 bg-white/6 text-zinc-300 hover:bg-white/10"
                }`}
              >
                <p className="text-xs font-medium">{option.label}</p>
                <p className="mt-1 text-[11px] text-zinc-400">{option.sub}</p>
              </button>
            );
          })}
        </div>
      </article>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="ui-surface-card p-5">
            <p className="ui-label">Matching Status</p>
            <p className="mt-2 text-[clamp(2rem,3.2vw,3rem)] font-semibold tracking-tight text-[var(--text)]">
              {matchedPct}%
            </p>
            <p className="mt-1 text-xs text-[var(--subtle)]">Transactions reconciled</p>
            <div className="mt-3 h-2 rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-900 transition-[width] duration-300"
                style={{ width: `${matchedPct}%` }}
              />
            </div>
          </article>

          <article className="ui-surface-card p-5">
            <p className="ui-label">Open Exceptions</p>
            <p className="mt-2 text-[clamp(2rem,3.2vw,3rem)] font-semibold tracking-tight text-[var(--text)]">
              {unmatchedTotal}
            </p>
            <p className="mt-1 text-xs text-[var(--subtle)]">
              Visible exposure {formatInr(visibleUnmatchedValue)}
            </p>
          </article>

          <article className="ui-surface-card p-5">
            <p className="ui-label">Needs Review</p>
            <p className="mt-2 text-[clamp(2rem,3.2vw,3rem)] font-semibold tracking-tight text-[var(--text)]">
              {needsReviewCount}
            </p>
            <p className="mt-1 text-xs text-[var(--subtle)]">
              Confidence between 60% and 95%
            </p>
          </article>

          <article className="ui-surface-card p-5">
            <p className="ui-label">High Priority</p>
            <p className="mt-2 text-[clamp(2rem,3.2vw,3rem)] font-semibold tracking-tight text-[var(--text)]">
              {criticalCount}
            </p>
            <p className="mt-1 text-xs text-[var(--subtle)]">
              Immediate exceptions by impact and aging
            </p>
          </article>
        </div>

        <article className="ui-surface-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">Attention queue</p>
            <AlertTriangle className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="mt-1 text-xs text-[var(--subtle)]">
            Sorted by severity, value impact, and aging.
          </p>

          <div className="mt-3 space-y-2">
            {queueTop.length === 0 ? (
              <p className="text-xs text-[var(--subtle)]">No open exceptions in this filter scope.</p>
            ) : (
              queueTop.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setActiveId(row.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    activeRow?.id === row.id
                      ? "border-zinc-800 bg-zinc-100"
                      : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${priorityTone(row.priority.level)}`}>
                      {row.priority.level}
                    </span>
                    <span className="text-[11px] text-zinc-500">#{row.id}</span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-zinc-900">{row.description}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {formatInr(row.amount)} • {row.ageDays}d old
                  </p>
                </button>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="ui-surface-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              value={draftQ}
              onChange={(event) => setDraftQ(event.target.value)}
              placeholder="Search by description or merchant..."
              aria-label="Search reconciliation rows"
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-3 text-sm text-zinc-700"
            />
          </div>

          <select
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
            aria-label="Filter by source"
          >
            {SOURCE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                Source: {value}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600">
            <Filter className="h-3.5 w-3.5" />
            From
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="border-none bg-transparent p-0 text-xs text-zinc-700 outline-none"
              aria-label="From date"
            />
          </label>

          <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600">
            <Filter className="h-3.5 w-3.5" />
            To
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="border-none bg-transparent p-0 text-xs text-zinc-700 outline-none"
              aria-label="To date"
            />
          </label>
        </div>
      </section>

      {notice ? (
        <div className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs text-zinc-800">
          {notice}
        </div>
      ) : null}

      {actionError || loadingError ? (
        <div className="rounded-xl border border-zinc-500 bg-zinc-200 px-3 py-2 text-xs text-zinc-900">
          {actionError ?? loadingError}
        </div>
      ) : null}

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <article className="ui-surface-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">Exception workbench</p>
            <p className="text-xs text-[var(--subtle)]">
              {transactionsQuery.isFetching
                ? "Refreshing..."
                : `${rows.length} rows on page / ${transactionsQuery.data?.total ?? 0} total`}
            </p>
          </div>

          {selectedIds.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2">
              <p className="text-xs font-medium text-zinc-800">{selectedIds.length} selected</p>
              <button
                type="button"
                onClick={() => matchMutation.mutate(selectedIds)}
                disabled={isBusy}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-800 hover:bg-zinc-200 disabled:opacity-60"
              >
                Match selected
              </button>
              <button
                type="button"
                onClick={() => reviewMutation.mutate(selectedIds)}
                disabled={isBusy}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-800 hover:bg-zinc-200 disabled:opacity-60"
              >
                Mark reviewed
              </button>
              <button
                type="button"
                onClick={() => setSelected({})}
                className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-200"
              >
                Clear
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="min-w-full border-collapse text-left text-sm" aria-label="Reconciliation exception table">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <th className="py-2.5 pl-3 pr-3">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selectedIds.length === rows.length}
                      onChange={(event) => toggleAllVisible(event.target.checked)}
                      aria-label="Select all visible reconciliation rows"
                      className="h-4 w-4 rounded border-zinc-300 bg-white text-zinc-900"
                    />
                  </th>
                  <th className="py-2.5 pr-3">Date</th>
                  <th className="py-2.5 pr-3">Description</th>
                  <th className="py-2.5 pr-3">Amount</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 pr-3">Priority</th>
                  <th className="py-2.5 pr-3">Suggestion</th>
                  <th className="py-2.5 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-zinc-500">
                      Loading reconciliation rows...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-xs text-zinc-500">
                      No exceptions for the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className={`border-b border-zinc-100 align-top transition ${
                        activeRow?.id === row.id ? "bg-zinc-100" : "bg-white hover:bg-zinc-50"
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500`}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest("button, input, select, a")) {
                          return;
                        }
                        setActiveId(row.id);
                      }}
                      onKeyDown={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest("button, input, select, a")) {
                          return;
                        }
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveId(row.id);
                        }
                      }}
                    >
                      <td className="py-2.5 pl-3 pr-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[row.id])}
                          onChange={() => toggleRow(row.id)}
                          aria-label={`Select transaction ${row.id}`}
                          className="h-4 w-4 rounded border-zinc-300 bg-white text-zinc-900"
                        />
                      </td>
                      <td className="py-2.5 pr-3 text-zinc-700">
                        <p>{formatDate(row.date)}</p>
                        <p className="mt-1 text-[11px] text-zinc-500">{row.ageDays}d</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="max-w-[280px] truncate text-zinc-900">{row.description}</p>
                        <p className="mt-1 text-[11px] uppercase text-zinc-500">{row.source}</p>
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-zinc-900">{formatInr(row.amount)}</td>
                      <td className="py-2.5 pr-3 text-xs">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-medium ${
                            row.matched
                              ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                              : "border-zinc-800 bg-zinc-800 text-white"
                          }`}
                        >
                          {row.matched ? "matched" : "unmatched"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${priorityTone(row.priority.level)}`}>
                          {row.priority.level}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-zinc-600">
                        {row.suggestion.candidateTransactionId ? (
                          <p>
                            #{row.suggestion.candidateTransactionId}
                            {row.suggestion.score !== null
                              ? ` • ${(row.suggestion.score * 100).toFixed(0)}%`
                              : ""}
                          </p>
                        ) : (
                          <p>No suggestion</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => matchMutation.mutate([row.id])}
                            disabled={isBusy || row.matched}
                            className="rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-[11px] text-zinc-800 hover:bg-zinc-200 disabled:opacity-60"
                          >
                            Match
                          </button>
                          <button
                            type="button"
                            onClick={() => reviewMutation.mutate([row.id])}
                            disabled={isBusy}
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || isLoading}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={isLoading || page >= (transactionsQuery.data?.totalPages ?? 0)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Next
              </button>
              <span className="text-xs text-zinc-500">
                Page {page}
                {transactionsQuery.data?.totalPages
                  ? ` of ${transactionsQuery.data.totalPages}`
                  : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500" htmlFor="reconciliation-page-size">
                Rows per page
              </label>
              <select
                id="reconciliation-page-size"
                value={limit}
                onChange={(event) => {
                  setLimit(Number.parseInt(event.target.value, 10));
                  setPage(1);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </article>

        <aside className="ui-surface-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">Context and explainability</p>
            <Clock3 className="h-4 w-4 text-zinc-500" />
          </div>

          {!activeRow ? (
            <p className="mt-3 text-xs text-[var(--subtle)]">
              Select an exception row to view full context and recommended action.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="ui-label">Transaction</p>
                <p className="mt-2 text-sm font-medium text-zinc-900">#{activeRow.id}</p>
                <p className="mt-1 text-sm text-zinc-700">{activeRow.description}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(activeRow.date)} • {formatInr(activeRow.amount)} • {activeRow.source}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Status: {activeRow.matched ? "matched" : "unmatched"}
                  {activeRow.confidence !== null
                    ? ` • Confidence ${(activeRow.confidence * 100).toFixed(0)}%`
                    : ""}
                </p>
              </article>

              <article className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="ui-label">Why flagged</p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                  {activeRow.priority.reasons.map((reason) => (
                    <li key={reason} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="ui-label">AI suggestion</p>
                {activeRow.suggestion.candidateTransactionId ? (
                  <div className="mt-2 text-xs text-zinc-700">
                    <p>
                      Candidate #{activeRow.suggestion.candidateTransactionId}
                      {activeRow.suggestion.score !== null
                        ? ` (${(activeRow.suggestion.score * 100).toFixed(0)}%)`
                        : ""}
                    </p>
                    <p className="mt-1 text-zinc-500">
                      Method: {activeRow.suggestion.method ?? "heuristic"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">No suggestion available for this row yet.</p>
                )}
              </article>

              <article className="rounded-xl border border-zinc-200 bg-white p-3">
                <p className="ui-label">Fast actions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => matchMutation.mutate([activeRow.id])}
                    disabled={isBusy || activeRow.matched}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Match now
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewMutation.mutate([activeRow.id])}
                    disabled={isBusy}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
                  >
                    Mark reviewed
                  </button>
                </div>
              </article>
            </div>
          )}
        </aside>
      </section>
    </section>
  );
}
