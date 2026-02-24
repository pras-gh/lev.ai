"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState
} from "@tanstack/react-table";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { CategoryCell } from "@/components/ledger/cells";
import {
  DEFAULT_FILTERS,
  useCategories,
  type FilterState
} from "@/components/ledger/filters";
import { HealthStrip, type LedgerPreset } from "@/components/dashboard/health-strip";
import { DataTable, EmptyState, ErrorState } from "@/components/design-system";
import { formatInr } from "@/lib/formatters";

type ApiTransactionRow = {
  id: number;
  occurred_at: string;
  description: string | null;
  counterparty: string | null;
  source: string;
  status: "pending" | "posted" | "reversed";
  direction: "credit" | "debit";
  amount: string;
  category_id: number | null;
  category_name: string | null;
  gst_amount: string | null;
  gst_applicable: boolean;
  matched: boolean;
  confidence: string | null;
  is_hidden: boolean;
  metadata?: Record<string, unknown>;
};

type TransactionsApiResponse = {
  count?: number;
  limit?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  transactions: ApiTransactionRow[];
};

type LedgerRow = {
  id: string;
  idNumeric: number;
  date: string;
  description: string;
  amountRaw: number;
  direction: "credit" | "debit";
  source: string;
  status: "pending" | "posted" | "reversed";
  categoryId: number | null;
  categoryName: string;
  matched: boolean;
  gstApplicable: boolean;
  gstAmount: number | null;
  itcMismatch: boolean;
  suggestedMatchTransactionId: number | null;
  suggestedMatchConfidence: number | null;
  isHidden: boolean;
  metadata?: Record<string, unknown>;
};

type ReconciliationMode = "all" | "unmatched" | "needs_review";

const PRESETS: LedgerPreset[] = ["unmatched", "itc_mismatch", "gst_due"];
const columnHelper = createColumnHelper<LedgerRow>();

type UndoEntry =
  | {
      kind: "categorize";
      label: string;
      previous: Array<{
        transactionId: number;
        categoryId: number | null;
        categoryName: string;
      }>;
    }
  | {
      kind: "exclude";
      label: string;
      transactionIds: number[];
    }
  | {
      kind: "split";
      label: string;
      sourceTransactionId: number;
      createdTransactionIds: number[];
    };

type CategorySuggestion = {
  categoryId: number;
  categoryName: string;
  confidence: number;
};

type LedgerPage = {
  rows: LedgerRow[];
  hasMore: boolean;
  nextCursor: string | null;
};

function isPreset(value: string | null): value is LedgerPreset {
  return value !== null && PRESETS.includes(value as LedgerPreset);
}

function formatSignedAmount(amountRaw: number, direction: "credit" | "debit"): string {
  const numeric = Math.abs(amountRaw);
  const signed = direction === "debit" ? -numeric : numeric;
  return formatInr(signed, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    signed: true
  });
}

function formatLedgerDate(value: string): string {
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

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

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

function parseSuggestion(metadata: Record<string, unknown> | undefined): {
  candidateId: number | null;
  score: number | null;
} {
  if (!metadata || typeof metadata !== "object") {
    return { candidateId: null, score: null };
  }

  const suggestionRaw = metadata.reconciliationSuggestion;
  if (!suggestionRaw || typeof suggestionRaw !== "object" || Array.isArray(suggestionRaw)) {
    return { candidateId: null, score: null };
  }

  const suggestion = suggestionRaw as Record<string, unknown>;
  const candidateId = Number.parseInt(String(suggestion.candidateTransactionId ?? ""), 10);
  const scoreParsed = Number(suggestion.score);

  return {
    candidateId: Number.isInteger(candidateId) && candidateId > 0 ? candidateId : null,
    score: Number.isFinite(scoreParsed) ? scoreParsed : null
  };
}

function normalizeDescription(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_RULES: Array<{
  category: string;
  confidence: number;
  patterns: RegExp[];
}> = [
  {
    category: "revenue",
    confidence: 0.92,
    patterns: [/\brazorpay settlement\b/i, /\bstripe payout\b/i, /\bpayment received\b/i]
  },
  {
    category: "tax",
    confidence: 0.9,
    patterns: [/\bgst\b/i, /\bcbic\b/i, /\btax payment\b/i, /\bgstr\b/i]
  },
  {
    category: "payroll",
    confidence: 0.89,
    patterns: [/\bsalary\b/i, /\bpayroll\b/i, /\bpf\b/i, /\besic\b/i]
  },
  {
    category: "marketing",
    confidence: 0.84,
    patterns: [/\bfacebook ads\b/i, /\bgoogle ads\b/i]
  },
  {
    category: "saas",
    confidence: 0.9,
    patterns: [/\bzoh?o\b/i, /\baws\b/i, /\bnotion\b/i, /\bopenai\b/i]
  },
  {
    category: "logistics",
    confidence: 0.86,
    patterns: [/\bdelhivery\b/i, /\bshiprocket\b/i]
  },
  {
    category: "fixed cost",
    confidence: 0.82,
    patterns: [/\brent\b/i, /\belectricity\b/i, /\binternet\b/i]
  }
];

function getAliases(category: string): string[] {
  if (category === "tax") {
    return ["tax", "gst"];
  }

  if (category === "fixed cost") {
    return ["fixed cost", "rent", "utilities"];
  }

  if (category === "saas") {
    return ["saas", "software"];
  }

  return [category];
}

function resolveCategoryByAliases(
  aliases: string[],
  categories: Array<{ id: number; name: string }>
): { id: number; name: string } | null {
  const normalizedAliases = aliases.map((alias) => normalizeDescription(alias));

  for (const category of categories) {
    const normalizedName = normalizeDescription(category.name);
    if (normalizedAliases.some((alias) => normalizedName === alias || normalizedName.includes(alias))) {
      return category;
    }
  }

  return null;
}

function parseMetadataSuggestion(
  metadata: Record<string, unknown> | undefined
): { categoryName: string; confidence: number } | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const suggestionRaw = metadata.categorization;
  if (!suggestionRaw || typeof suggestionRaw !== "object" || Array.isArray(suggestionRaw)) {
    return null;
  }

  const suggestion = suggestionRaw as Record<string, unknown>;
  const categoryName = typeof suggestion.categoryName === "string" ? suggestion.categoryName.trim() : "";
  const confidenceRaw = Number(suggestion.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(Math.max(confidenceRaw, 0), 1) : 0;

  if (!categoryName || confidence <= 0) {
    return null;
  }

  return { categoryName, confidence };
}

function getCategorySuggestion(
  row: LedgerRow,
  categories: Array<{ id: number; name: string }>
): CategorySuggestion | null {
  if (row.categoryId !== null) {
    return null;
  }

  const metadataSuggestion = parseMetadataSuggestion(row.metadata);
  if (metadataSuggestion) {
    const resolved = resolveCategoryByAliases([metadataSuggestion.categoryName], categories);
    if (resolved) {
      return {
        categoryId: resolved.id,
        categoryName: resolved.name,
        confidence: metadataSuggestion.confidence
      };
    }
  }

  const normalized = normalizeDescription(row.description);
  if (!normalized) {
    return null;
  }

  for (const rule of CATEGORY_RULES) {
    if (!rule.patterns.some((pattern) => pattern.test(normalized))) {
      continue;
    }

    const resolved = resolveCategoryByAliases(getAliases(rule.category), categories);
    if (resolved) {
      return {
        categoryId: resolved.id,
        categoryName: resolved.name,
        confidence: rule.confidence
      };
    }
  }

  return null;
}

async function fetchLedgerPage(args: {
  scopeQuery: string;
  filters: FilterState;
  cursor: string | null;
  pageSize: number;
  activePreset: LedgerPreset | null;
  reconciliationMode: ReconciliationMode;
  impactedIds: number[];
  signal?: AbortSignal;
}): Promise<LedgerPage> {
  const params = new URLSearchParams(args.scopeQuery);
  params.set("limit", String(args.pageSize));
  params.set("cursor", args.cursor ?? "");

  if (args.filters.q.trim()) {
    params.set("q", args.filters.q.trim());
  }

  if (args.filters.status !== "all") {
    params.set("status", args.filters.status);
  }

  if (args.filters.source !== "all") {
    params.set("source", args.filters.source);
  }

  if (args.filters.category.trim()) {
    params.set("category", args.filters.category.trim());
  }

  if (args.filters.from) {
    params.set("from", args.filters.from);
  }

  if (args.filters.to) {
    params.set("to", args.filters.to);
  }

  if (args.filters.includeHidden) {
    params.set("includeDeleted", "true");
  }

  if (args.activePreset) {
    params.set("preset", args.activePreset);
  }

  if (args.reconciliationMode !== "all") {
    params.set("recon", args.reconciliationMode);
  }

  if (args.impactedIds.length > 0) {
    params.set("ids", args.impactedIds.join(","));
  }

  const response = await fetch(`/api/transactions?${params.toString()}`, {
    cache: "no-store",
    signal: args.signal
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, `Transactions request failed (${response.status})`));
  }

  const data = (await response.json()) as TransactionsApiResponse;

  const rows: LedgerRow[] = (data.transactions ?? []).map((txn) => {
    const suggestion = parseSuggestion(txn.metadata);
    const suggestedMatchConfidence = suggestion.score ?? toNumber(txn.confidence);

    return {
      id: String(txn.id),
      idNumeric: txn.id,
      date: txn.occurred_at?.slice(0, 10) ?? "",
      description: txn.description ?? txn.counterparty ?? `Transaction ${txn.id}`,
      amountRaw: Math.abs(Number(txn.amount) || 0),
      direction: txn.direction,
      source: txn.source,
      status: txn.status,
      categoryId: txn.category_id,
      categoryName: txn.category_name ?? "Uncategorized",
      matched: Boolean(txn.matched),
      gstApplicable: Boolean(txn.gst_applicable),
      gstAmount: toNumber(txn.gst_amount),
      itcMismatch: args.activePreset === "itc_mismatch",
      suggestedMatchTransactionId: suggestion.candidateId,
      suggestedMatchConfidence,
      isHidden: Boolean(txn.is_hidden),
      metadata: txn.metadata
    };
  });

  return {
    rows,
    hasMore: Boolean(data.hasMore),
    nextCursor: data.nextCursor ?? null
  };
}

export function TransactionsLedger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const workspaceId = searchParams.get("workspaceId");
  const businessId = searchParams.get("businessId") ?? "1";
  const businessIdNumber = Number(businessId) || 1;

  const scopeQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (workspaceId) {
      params.set("workspaceId", workspaceId);
    } else {
      params.set("businessId", businessId);
    }
    return params.toString();
  }, [workspaceId, businessId]);

  const scopeBody = useMemo(
    () => (workspaceId ? { workspaceId } : { businessId: businessIdNumber }),
    [workspaceId, businessIdNumber]
  );

  const activePreset = useMemo(() => {
    const raw = searchParams.get("preset");
    return isPreset(raw) ? raw : null;
  }, [searchParams]);
  const reconciliationMode = useMemo<ReconciliationMode>(() => {
    const raw = searchParams.get("recon");
    if (raw === "unmatched" || raw === "needs_review" || raw === "all") {
      return raw;
    }

    return "all";
  }, [searchParams]);
  const impactedIds = useMemo(
    () => parseTransactionIds(searchParams.get("ids")),
    [searchParams]
  );
  const selectedAlertId = searchParams.get("alert");

  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [batchCategoryId, setBatchCategoryId] = useState("");
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const { categories } = useCategories(scopeQuery);
  const impactedIdsKey = useMemo(() => impactedIds.join(","), [impactedIds]);
  const currentCursor = pageCursors[page - 1] ?? null;

  const fetchCurrentPage = useCallback(
    (cursor: string | null, signal?: AbortSignal) =>
      fetchLedgerPage({
        scopeQuery,
        filters,
        cursor,
        pageSize,
        activePreset,
        reconciliationMode,
        impactedIds,
        signal
      }),
    [scopeQuery, filters, pageSize, activePreset, reconciliationMode, impactedIds]
  );

  const ledgerQueryKey = useMemo(
    () =>
      [
        "transactions",
        scopeQuery,
        page,
        currentCursor ?? "",
        pageSize,
        filters.q.trim(),
        filters.status,
        filters.source,
        filters.category.trim(),
        filters.from,
        filters.to,
        filters.includeHidden ? "1" : "0",
        activePreset ?? "",
        reconciliationMode,
        impactedIdsKey
      ] as const,
    [
      scopeQuery,
      page,
      currentCursor,
      pageSize,
      filters.q,
      filters.status,
      filters.source,
      filters.category,
      filters.from,
      filters.to,
      filters.includeHidden,
      activePreset,
      reconciliationMode,
      impactedIdsKey
    ]
  );

  const ledgerQuery = useQuery({
    queryKey: ledgerQueryKey,
    queryFn: ({ signal }) => fetchCurrentPage(currentCursor, signal),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
    gcTime: 5 * 60_000
  });

  useEffect(() => {
    if (!ledgerQuery.data) {
      return;
    }

    setRows(ledgerQuery.data.rows);
    setHasMore(ledgerQuery.data.hasMore);

    if (ledgerQuery.data.hasMore && ledgerQuery.data.nextCursor) {
      setPageCursors((current) => {
        const next = [...current];
        next[page] = ledgerQuery.data.nextCursor;
        return next;
      });
    } else {
      setPageCursors((current) => current.slice(0, Math.max(page, 1)));
    }
  }, [ledgerQuery.data, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => {
        if (current.q === draftFilters.q) {
          return current;
        }

        return { ...current, q: draftFilters.q };
      });
      setPage((current) => (current === 1 ? current : 1));
      setPageCursors([null]);
    }, 280);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftFilters.q]);

  useEffect(() => {
    setRowSelection({});
  }, [rows]);

  const refreshSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/transactions/reconcile/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          limit: 250,
          maxDateWindowDays: 3,
          confidenceThreshold: 0.6
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to refresh suggestions"));
      }

      return response.json() as Promise<{
        scanned?: number;
        suggestions?: number;
        recon_match_pct?: number;
      }>;
    },
    onMutate: () => {
      setMutationError(null);
      setSuggestionMessage(null);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions", scopeQuery] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] })
      ]);

      setSuggestionMessage(
        `Suggestions refreshed: ${result.suggestions ?? 0} pairs from ${result.scanned ?? 0} rows.`
      );
    },
    onError: (error) => {
      setMutationError(
        error instanceof Error ? error.message : "Failed to refresh suggestions"
      );
    }
  });

  useEffect(() => {
    const onRefresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions", scopeQuery] });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ledger:refresh", onRefresh);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("ledger:refresh", onRefresh);
      }
    };
  }, [queryClient, scopeQuery]);

  function setPreset(preset: LedgerPreset | null) {
    const next = new URLSearchParams(searchParams.toString());

    if (preset) {
      next.set("preset", preset);
    } else {
      next.delete("preset");
    }

    if (!next.get("workspaceId") && !next.get("businessId")) {
      next.set("businessId", businessId);
    }

    setPage(1);
    setPageCursors([null]);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setReconciliationMode(mode: ReconciliationMode) {
    const next = new URLSearchParams(searchParams.toString());

    if (mode === "all") {
      next.delete("recon");
    } else {
      next.set("recon", mode);
    }

    if (!next.get("workspaceId") && !next.get("businessId")) {
      next.set("businessId", businessId);
    }

    setPage(1);
    setPageCursors([null]);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function openTransactionDetails(transactionId: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("txn", String(transactionId));
    next.set("panel", "details");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearAlertImpactFilter() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("ids");
    next.delete("alert");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setPage(1);
    setPageCursors([null]);
  }

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]).map((id) => Number(id)),
    [rowSelection]
  );

  const selectedCount = selectedIds.length;

  const refreshLedger = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["transactions", scopeQuery] });
  }, [queryClient, scopeQuery]);

  const invalidateHealth = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["metrics", "health"] });
  }, [queryClient]);

  const runTransactionPatch = useCallback(
    async (transactionId: number, payload: Record<string, unknown>) => {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          ...payload
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(data, "Failed to update transaction"));
      }
    },
    [scopeBody]
  );

  const runBatch = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          ...payload
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(data, "Batch action failed"));
      }

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      return data;
    },
    [scopeBody]
  );

  const handleGstToggle = useCallback(
    async (row: LedgerRow, nextValue: boolean) => {
      setIsMutating(true);
      setMutationError(null);
      try {
        await runTransactionPatch(row.idNumeric, {
          gstApplicable: nextValue,
          gstAmount: nextValue ? row.gstAmount : null
        });
        setRows((currentRows) =>
          currentRows.map((entry) =>
            entry.id === row.id
              ? {
                  ...entry,
                  gstApplicable: nextValue,
                  gstAmount: nextValue ? entry.gstAmount : null
                }
              : entry
          )
        );
      } catch (toggleError) {
        setMutationError(
          toggleError instanceof Error ? toggleError.message : "Failed to update GST state"
        );
      } finally {
        setIsMutating(false);
      }
    },
    [runTransactionPatch]
  );

  const handleMatchSingle = useCallback(
    async (row: LedgerRow) => {
      setIsMutating(true);
      setMutationError(null);
      const snapshot = rows;
      try {
        const transactionIds = [row.idNumeric];
        const candidateId = row.suggestedMatchTransactionId;
        if (
          Number.isInteger(candidateId) &&
          candidateId !== null &&
          candidateId > 0 &&
          candidateId !== row.idNumeric
        ) {
          transactionIds.push(candidateId);
        }

        const matchedIds = new Set([...new Set(transactionIds)]);
        setRows((currentRows) =>
          currentRows.map((entry) =>
            matchedIds.has(entry.idNumeric)
              ? {
                  ...entry,
                  matched: true,
                  suggestedMatchTransactionId: null,
                  suggestedMatchConfidence: null
                }
              : entry
          )
        );

        await runBatch({
          action: "match",
          transactionIds: [...new Set(transactionIds)],
          confidence: row.suggestedMatchConfidence ?? 0.9
        });
        await invalidateHealth();
        refreshLedger();
      } catch (matchError) {
        setRows(snapshot);
        setMutationError(matchError instanceof Error ? matchError.message : "Failed to mark as matched");
      } finally {
        setIsMutating(false);
      }
    },
    [rows, runBatch, invalidateHealth, refreshLedger]
  );

  const handleVisibilityToggle = useCallback(
    async (row: LedgerRow, hidden: boolean) => {
      setIsMutating(true);
      setMutationError(null);
      try {
        await runTransactionPatch(row.idNumeric, {
          action: hidden ? "hide" : "unhide",
          reason: hidden ? "Hidden from ledger table" : undefined
        });
        refreshLedger();
      } catch (visibilityError) {
        setMutationError(
          visibilityError instanceof Error
            ? visibilityError.message
            : `Failed to ${hidden ? "hide" : "unhide"} transaction`
        );
      } finally {
        setIsMutating(false);
      }
    },
    [runTransactionPatch, refreshLedger]
  );

  const handleReverseSingle = useCallback(
    async (row: LedgerRow) => {
      if (row.status === "reversed") {
        return;
      }

      setIsMutating(true);
      setMutationError(null);
      try {
        await runTransactionPatch(row.idNumeric, {
          action: "reverse",
          reason: "Reversed from ledger quick action",
          markOriginalReversed: true
        });
        setSuggestionMessage(`Created reversal entry for #${row.idNumeric}.`);
        refreshLedger();
        await invalidateHealth();
      } catch (reverseError) {
        setMutationError(
          reverseError instanceof Error ? reverseError.message : "Failed to reverse transaction"
        );
      } finally {
        setIsMutating(false);
      }
    },
    [runTransactionPatch, refreshLedger, invalidateHealth]
  );

  const handleSplitSingle = useCallback(
    async (row: LedgerRow) => {
      setIsMutating(true);
      setMutationError(null);
      try {
        const result = await runBatch({
          action: "split",
          transactionIds: [row.idNumeric],
          splitRatio: 0.5,
          note: "Split from row quick action"
        });

        const split = result.split as
          | {
              createdTransactionIds?: number[];
            }
          | undefined;
        const createdTransactionIds = (split?.createdTransactionIds ?? []).filter((id) =>
          Number.isInteger(id)
        ) as number[];

        setUndoStack((current) => [
          {
            kind: "split",
            label: `Split transaction #${row.idNumeric} (50/50)`,
            sourceTransactionId: row.idNumeric,
            createdTransactionIds
          },
          ...current
        ]);
        setSuggestionMessage(
          createdTransactionIds.length > 0
            ? `Split #${row.idNumeric}: created #${createdTransactionIds.join(", ")}`
            : `Split #${row.idNumeric} complete`
        );
        refreshLedger();
      } catch (splitError) {
        setMutationError(splitError instanceof Error ? splitError.message : "Failed to split transaction");
      } finally {
        setIsMutating(false);
      }
    },
    [runBatch, refreshLedger]
  );

  const handleBatchCategorize = useCallback(async () => {
    if (selectedIds.length === 0 || !batchCategoryId) {
      return;
    }

    const targetCategoryId = Number.parseInt(batchCategoryId, 10);
    const targetCategory = categories.find((category) => category.id === targetCategoryId);
    if (!targetCategory) {
      setMutationError("Select a valid category before categorizing");
      return;
    }

    setIsMutating(true);
    setMutationError(null);

    const selectedSet = new Set(selectedIds);
    const previous = rows
      .filter((entry) => selectedSet.has(entry.idNumeric))
      .map((entry) => ({
        transactionId: entry.idNumeric,
        categoryId: entry.categoryId,
        categoryName: entry.categoryName
      }));

    const snapshot = rows;
    setRows((currentRows) =>
      currentRows.map((entry) =>
        selectedSet.has(entry.idNumeric)
          ? { ...entry, categoryId: targetCategoryId, categoryName: targetCategory.name }
          : entry
      )
    );

    try {
      await runBatch({
        action: "categorize",
        transactionIds: selectedIds,
        categoryId: targetCategoryId
      });
      setUndoStack((current) => [
        {
          kind: "categorize",
          label: `Categorized ${selectedIds.length} row(s)`,
          previous
        },
        ...current
      ]);
      setSuggestionMessage(`Updated ${selectedIds.length} row(s) to ${targetCategory.name}.`);
      setRowSelection({});
      refreshLedger();
    } catch (batchError) {
      setRows(snapshot);
      setMutationError(batchError instanceof Error ? batchError.message : "Failed to batch categorize");
    } finally {
      setIsMutating(false);
    }
  }, [selectedIds, batchCategoryId, categories, rows, runBatch, refreshLedger]);

  const handleBatchCategorizeSimilar = useCallback(async () => {
    if (selectedIds.length === 0 || !batchCategoryId) {
      return;
    }

    const targetCategoryId = Number.parseInt(batchCategoryId, 10);
    const targetCategory = categories.find((category) => category.id === targetCategoryId);
    if (!targetCategory) {
      setMutationError("Select a valid category before applying to similar descriptions");
      return;
    }

    const selectedSet = new Set(selectedIds);
    const selectedDescriptions = new Set(
      rows
        .filter((entry) => selectedSet.has(entry.idNumeric))
        .map((entry) => normalizeDescription(entry.description))
        .filter(Boolean)
    );

    if (selectedDescriptions.size === 0) {
      setMutationError("No comparable descriptions found in selection");
      return;
    }

    const similarRows = rows.filter((entry) =>
      selectedDescriptions.has(normalizeDescription(entry.description))
    );

    const similarIds = [...new Set(similarRows.map((entry) => entry.idNumeric))];
    if (similarIds.length === 0) {
      return;
    }

    const previous = similarRows.map((entry) => ({
      transactionId: entry.idNumeric,
      categoryId: entry.categoryId,
      categoryName: entry.categoryName
    }));

    const similarSet = new Set(similarIds);
    const snapshot = rows;

    setIsMutating(true);
    setMutationError(null);
    setRows((currentRows) =>
      currentRows.map((entry) =>
        similarSet.has(entry.idNumeric)
          ? { ...entry, categoryId: targetCategoryId, categoryName: targetCategory.name }
          : entry
      )
    );

    try {
      await runBatch({
        action: "categorize",
        transactionIds: similarIds,
        categoryId: targetCategoryId,
        note: "Applied to similar descriptions"
      });
      setUndoStack((current) => [
        {
          kind: "categorize",
          label: `Applied to ${similarIds.length} similar row(s)`,
          previous
        },
        ...current
      ]);
      setSuggestionMessage(
        `Applied ${targetCategory.name} to ${similarIds.length} row(s) with similar descriptions.`
      );
      setRowSelection({});
      refreshLedger();
    } catch (error) {
      setRows(snapshot);
      setMutationError(
        error instanceof Error
          ? error.message
          : "Failed to apply category to similar descriptions"
      );
    } finally {
      setIsMutating(false);
    }
  }, [selectedIds, batchCategoryId, categories, rows, runBatch, refreshLedger]);

  const handleBatchExclude = useCallback(async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setMutationError(null);
    const snapshot = rows;
    const selectedSet = new Set(selectedIds);
    setRows((currentRows) => currentRows.filter((entry) => !selectedSet.has(entry.idNumeric)));

    try {
      await Promise.all(
        selectedIds.map((transactionId) =>
          runTransactionPatch(transactionId, {
            action: "hide",
            reason: "Marked as personal/excluded from UI"
          })
        )
      );

      setUndoStack((current) => [
        {
          kind: "exclude",
          label: `Excluded ${selectedIds.length} row(s)`,
          transactionIds: [...selectedIds]
        },
        ...current
      ]);
      setSuggestionMessage(`Excluded ${selectedIds.length} row(s) from UI ledger.`);
      setRowSelection({});
      refreshLedger();
    } catch (error) {
      setRows(snapshot);
      setMutationError(
        error instanceof Error ? error.message : "Failed to mark transactions as personal/excluded"
      );
    } finally {
      setIsMutating(false);
    }
  }, [selectedIds, rows, runTransactionPatch, refreshLedger]);

  const handleBatchSplit = useCallback(async () => {
    if (selectedIds.length !== 1) {
      setMutationError("Select exactly one transaction to split");
      return;
    }

    const sourceId = selectedIds[0];
    setIsMutating(true);
    setMutationError(null);
    try {
      const result = await runBatch({
        action: "split",
        transactionIds: [sourceId],
        splitRatio: 0.5,
        note: "Split from bulk toolbar"
      });

      const split = result.split as
        | {
            createdTransactionIds?: number[];
          }
        | undefined;
      const createdTransactionIds = (split?.createdTransactionIds ?? []).filter((id) =>
        Number.isInteger(id)
      ) as number[];

      setUndoStack((current) => [
        {
          kind: "split",
          label: "Split transaction 50/50",
          sourceTransactionId: sourceId,
          createdTransactionIds
        },
        ...current
      ]);
      setSuggestionMessage(
        createdTransactionIds.length > 0
          ? `Split complete: created #${createdTransactionIds.join(", ")}`
          : "Split complete"
      );
      setRowSelection({});
      refreshLedger();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Failed to split transaction");
    } finally {
      setIsMutating(false);
    }
  }, [selectedIds, runBatch, refreshLedger]);

  const handleBatchMatch = useCallback(async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setMutationError(null);
    const snapshot = rows;
    try {
      const selectedSet = new Set(selectedIds);
      setRows((currentRows) =>
        currentRows.map((entry) =>
          selectedSet.has(entry.idNumeric)
            ? {
                ...entry,
                matched: true,
                suggestedMatchTransactionId: null,
                suggestedMatchConfidence: null
              }
            : entry
        )
      );

      await runBatch({
        action: "match",
        transactionIds: selectedIds,
        confidence: 0.9
      });
      await invalidateHealth();
      setRowSelection({});
      refreshLedger();
    } catch (batchError) {
      setRows(snapshot);
      setMutationError(batchError instanceof Error ? batchError.message : "Failed to batch match");
    } finally {
      setIsMutating(false);
    }
  }, [selectedIds, rows, runBatch, invalidateHealth, refreshLedger]);

  const handleBatchResolve = useCallback(async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setIsMutating(true);
    setMutationError(null);
    try {
      await runBatch({
        action: "resolve",
        transactionIds: selectedIds
      });
      setRowSelection({});
      refreshLedger();
    } catch (batchError) {
      setMutationError(batchError instanceof Error ? batchError.message : "Failed to resolve selection");
    } finally {
      setIsMutating(false);
    }
  }, [selectedIds, runBatch, refreshLedger]);

  const handleUndoLastAction = useCallback(async () => {
    const entry = undoStack[0];
    if (!entry) {
      return;
    }

    setIsMutating(true);
    setMutationError(null);
    try {
      if (entry.kind === "categorize") {
        await Promise.all(
          entry.previous.map((item) =>
            runTransactionPatch(item.transactionId, {
              categoryId: item.categoryId
            })
          )
        );
      }

      if (entry.kind === "exclude") {
        await Promise.all(
          entry.transactionIds.map((transactionId) =>
            runTransactionPatch(transactionId, {
              action: "unhide"
            })
          )
        );
      }

      if (entry.kind === "split") {
        if (entry.createdTransactionIds.length > 0) {
          await Promise.all(
            entry.createdTransactionIds.map((transactionId) =>
              runTransactionPatch(transactionId, {
                action: "hide",
                reason: "Undo split"
              })
            )
          );
        }
        await runTransactionPatch(entry.sourceTransactionId, {
          action: "unhide"
        });
      }

      setUndoStack((current) => current.slice(1));
      setSuggestionMessage(`Undid: ${entry.label}`);
      refreshLedger();
      await invalidateHealth();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Failed to undo last action");
    } finally {
      setIsMutating(false);
    }
  }, [undoStack, runTransactionPatch, refreshLedger, invalidateHealth]);

  const isLoading = ledgerQuery.isPending;
  const isRefreshing = ledgerQuery.isFetching;
  const queryError = ledgerQuery.error instanceof Error ? ledgerQuery.error.message : null;
  const error = mutationError ?? queryError;
  const hasActiveFilters =
    filters.q.trim().length > 0 ||
    filters.status !== "all" ||
    filters.source !== "all" ||
    filters.category.trim().length > 0 ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.includeHidden ||
    activePreset !== null ||
    reconciliationMode !== "all" ||
    impactedIds.length > 0;
  const isFirstRunEmpty = !isLoading && rows.length === 0 && page === 1 && !hasActiveFilters;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 bg-white text-[var(--accent)]"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 bg-white text-[var(--accent)]"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`Select transaction ${row.original.id}`}
          />
        ),
        size: 40
      }),
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => <span className="text-zinc-700">{formatLedgerDate(info.getValue())}</span>
      }),
      columnHelper.display({
        id: "description",
        header: "Description",
        cell: ({ row }) => (
          <div>
            <p className="text-zinc-800">{row.original.description}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {!row.original.matched ? (
                <span className="inline-flex items-center gap-1 rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-800">
                  <AlertCircle className="h-3 w-3" aria-hidden />
                  unmatched
                </span>
              ) : null}
              {row.original.isHidden ? (
                <span className="inline-flex items-center rounded bg-zinc-300 px-2 py-0.5 text-xs text-zinc-800">
                  hidden
                </span>
              ) : null}
            </div>
          </div>
        )
      }),
      columnHelper.display({
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium text-zinc-900">
            {formatSignedAmount(row.original.amountRaw, row.original.direction)}
          </span>
        )
      }),
      columnHelper.display({
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const suggestion = getCategorySuggestion(row.original, categories);

          return (
            <CategoryCell
              transactionId={row.original.idNumeric}
              currentCategoryId={row.original.categoryId}
              currentCategoryName={row.original.categoryName}
              scopeKey={scopeQuery}
              categories={categories}
              scopeBody={scopeBody}
              suggestion={suggestion}
              disabled={isMutating}
              onMutationStateChange={setIsMutating}
              onOptimisticUpdate={(nextCategoryId, nextCategoryName) => {
                setMutationError(null);
                setRows((currentRows) =>
                  currentRows.map((entry) =>
                    entry.id === row.original.id
                      ? {
                          ...entry,
                          categoryId: nextCategoryId,
                          categoryName: nextCategoryName
                        }
                      : entry
                  )
                );
              }}
            />
          );
        }
      }),
      columnHelper.accessor("source", {
        header: "Source",
        cell: (info) => (
          <span className="rounded bg-zinc-100 px-2 py-1 text-xs uppercase text-zinc-700">
            {info.getValue()}
          </span>
        )
      }),
      columnHelper.display({
        id: "gst",
        header: "GST",
        cell: ({ row }) => (
            <label className="flex items-center gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 bg-white text-[var(--accent)]"
                checked={row.original.gstApplicable}
                disabled={isMutating}
                onChange={(event) => {
                  void handleGstToggle(row.original, event.target.checked);
                }}
            />
            <span>
              {row.original.gstApplicable
                ? row.original.gstAmount !== null
                  ? formatInr(row.original.gstAmount, { maximumFractionDigits: 2 })
                  : "Applicable"
                : "No"}
            </span>
          </label>
        )
      }),
      columnHelper.display({
        id: "match",
        header: "Match",
        cell: ({ row }) =>
          row.original.matched ? (
            <span className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-800">matched</span>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  void handleMatchSingle(row.original);
                }}
                disabled={isMutating}
                className="rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-200"
              >
                Match
              </button>
              {row.original.suggestedMatchTransactionId ? (
                <p className="text-[11px] text-zinc-500">
                  suggestion #{row.original.suggestedMatchTransactionId}
                  {row.original.suggestedMatchConfidence !== null
                    ? ` • ${(row.original.suggestedMatchConfidence * 100).toFixed(0)}%`
                    : ""}
                </p>
              ) : null}
            </div>
          )
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const canReverse = row.original.status === "posted" && !row.original.isHidden;
          const canSplit = row.original.status !== "reversed" && !row.original.isHidden;

          return (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  void handleVisibilityToggle(row.original, !row.original.isHidden);
                }}
                disabled={isMutating}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                {row.original.isHidden ? "unhide" : "hide"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleReverseSingle(row.original);
                }}
                disabled={isMutating || !canReverse}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                reverse
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSplitSingle(row.original);
                }}
                disabled={isMutating || !canSplit}
                className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                split
              </button>
            </div>
          );
        }
      })
    ],
    [
      categories,
      handleGstToggle,
      handleReverseSingle,
      handleSplitSingle,
      handleVisibilityToggle,
      handleMatchSingle,
      isMutating,
      scopeBody,
      scopeQuery
    ]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id
  });

  function applyFilters() {
    setFilters(draftFilters);
    setPage(1);
    setPageCursors([null]);
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setPageCursors([null]);
  }

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    const nextCursor = ledgerQuery.data?.nextCursor ?? null;
    if (!nextCursor) {
      return;
    }

    setPageCursors((current) => {
      const next = [...current];
      next[page] = nextCursor;
      return next;
    });
    setPage((current) => current + 1);
  }

  return (
    <>
      <HealthStrip scopeQuery={scopeQuery} activePreset={activePreset} onPresetChange={setPreset} />

      <section className="ui-surface-card p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Ledger Filters</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <input
            value={draftFilters.q}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="Search description..."
            aria-label="Search transactions"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          />

          <select
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                status: event.target.value as FilterState["status"]
              }))
            }
            aria-label="Filter by status"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          >
            <option value="all">Status: all</option>
            <option value="posted">Status: posted</option>
            <option value="pending">Status: pending</option>
            <option value="reversed">Status: reversed</option>
          </select>

          <select
            value={draftFilters.source}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                source: event.target.value as FilterState["source"]
              }))
            }
            aria-label="Filter by source"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          >
            <option value="all">Source: all</option>
            <option value="bank">bank</option>
            <option value="upi">upi</option>
            <option value="razorpay">razorpay</option>
            <option value="stripe">stripe</option>
            <option value="hdfc">hdfc</option>
            <option value="icici">icici</option>
            <option value="gpay">gpay</option>
            <option value="tally">tally</option>
            <option value="whatsapp">whatsapp</option>
            <option value="zohobooks">zohobooks</option>
            <option value="manual">manual</option>
            <option value="csv_import">csv_import</option>
            <option value="csv_proof">csv_proof</option>
            <option value="reversal">reversal</option>
            <option value="import">import</option>
          </select>

          <select
            value={draftFilters.category}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                category: event.target.value
              }))
            }
            aria-label="Filter by category"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">Category: all</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={draftFilters.from}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, from: event.target.value }))
            }
            aria-label="From date"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          />

          <input
            type="date"
            value={draftFilters.to}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, to: event.target.value }))
            }
            aria-label="To date"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700"
          />

          <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={draftFilters.includeHidden}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  includeHidden: event.target.checked
                }))
              }
              aria-label="Include hidden transactions"
              className="h-4 w-4 rounded border-zinc-300 bg-white"
            />
            Include hidden rows
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Date filters are inclusive and use posted transaction date.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-sm shadow-black/25"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Clear filters
          </button>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            Scope: {workspaceId ? "Workspace" : `Business ${businessId}`}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {activePreset ? `Active preset: ${activePreset}` : "Preset: none"}
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-zinc-300 bg-white">
            <button
              type="button"
              onClick={() => setReconciliationMode("all")}
              className={`px-3 py-2 text-xs ${
                reconciliationMode === "all"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setReconciliationMode("unmatched")}
              className={`border-l border-zinc-300 px-3 py-2 text-xs ${
                reconciliationMode === "unmatched"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              Unmatched
            </button>
            <button
              type="button"
              onClick={() => setReconciliationMode("needs_review")}
              className={`border-l border-zinc-300 px-3 py-2 text-xs ${
                reconciliationMode === "needs_review"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              Needs review
            </button>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            Recon: {reconciliationMode.replace("_", " ")}
          </div>
          <button
            type="button"
            onClick={() => refreshSuggestionsMutation.mutate()}
            disabled={refreshSuggestionsMutation.isPending || isMutating}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
          >
            {refreshSuggestionsMutation.isPending
              ? "Refreshing suggestions..."
              : "Refresh match suggestions"}
          </button>
          {activePreset ? (
            <button
              type="button"
              onClick={() => setPreset(null)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100"
            >
              Clear filter
            </button>
          ) : null}
          {impactedIds.length > 0 ? (
            <>
              <div className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
                Alert filter: {impactedIds.length} impacted row(s)
                {selectedAlertId ? ` (alert #${selectedAlertId})` : ""}
              </div>
              <button
                type="button"
                onClick={clearAlertImpactFilter}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100"
              >
                Clear alert filter
              </button>
            </>
          ) : null}
          {suggestionMessage ? (
            <div className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
              {suggestionMessage}
            </div>
          ) : null}
          {undoStack.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                void handleUndoLastAction();
              }}
              disabled={isMutating}
              className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
            >
              Undo last action
            </button>
          ) : null}
        </div>
      </section>

      {selectedCount > 0 ? (
        <section className="rounded-2xl border border-white/24 bg-white/10 p-4 text-zinc-100 shadow-lg shadow-black/25">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{selectedCount} row(s) selected</p>
            <select
              value={batchCategoryId}
              onChange={(event) => setBatchCategoryId(event.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800"
            >
              <option value="">Choose category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                void handleBatchCategorize();
              }}
              disabled={isMutating || !batchCategoryId}
              className="rounded-md bg-white px-3 py-1 text-xs font-medium text-zinc-900 disabled:opacity-50"
            >
              Batch categorize
            </button>
            <button
              type="button"
              onClick={() => {
                void handleBatchCategorizeSimilar();
              }}
              disabled={isMutating || !batchCategoryId}
              className="rounded-md border border-white/60 px-3 py-1 text-xs text-zinc-100 disabled:opacity-50"
            >
              Apply to similar descriptions
            </button>
            <button
              type="button"
              onClick={() => {
                void handleBatchMatch();
              }}
              disabled={isMutating}
              className="rounded-md border border-white/60 px-3 py-1 text-xs text-zinc-100 disabled:opacity-50"
            >
              Batch match
            </button>
            <button
              type="button"
              onClick={() => {
                void handleBatchResolve();
              }}
              disabled={isMutating}
              className="rounded-md border border-white/60 px-3 py-1 text-xs text-zinc-100 disabled:opacity-50"
            >
              Resolve alerts
            </button>
            <button
              type="button"
              onClick={() => {
                void handleBatchExclude();
              }}
              disabled={isMutating}
              className="rounded-md border border-white/60 px-3 py-1 text-xs text-zinc-100 disabled:opacity-50"
            >
              Mark personal / exclude
            </button>
            <button
              type="button"
              onClick={() => {
                void handleBatchSplit();
              }}
              disabled={isMutating || selectedCount !== 1}
              className="rounded-md border border-white/60 px-3 py-1 text-xs text-zinc-100 disabled:opacity-50"
            >
              Split transaction (50/50)
            </button>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="rounded-md border border-white/40 px-3 py-1 text-xs text-zinc-100"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => {
                void handleUndoLastAction();
              }}
              disabled={isMutating || undoStack.length === 0}
              className="rounded-md border border-white/45 bg-white/8 px-3 py-1 text-xs text-zinc-100 disabled:opacity-50"
            >
              Undo
            </button>
          </div>
        </section>
      ) : null}

      {undoStack.length > 0 ? (
        <div className="rounded-xl border border-white/24 bg-white/10 px-3 py-2 text-xs text-zinc-100">
          Last action: {undoStack[0].label}
        </div>
      ) : null}

      <DataTable
        title="Ledger"
        meta={
          isLoading
            ? "Loading..."
            : isRefreshing
              ? `Refreshing... ${rows.length} row(s) on page ${page} (cursor)`
              : `${rows.length} row(s) on page ${page} (cursor)`
        }
        error={error ? <ErrorState message={error} /> : undefined}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={isLoading || page <= 1}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextPage}
                disabled={isLoading || !hasMore || !ledgerQuery.data?.nextCursor}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Next
              </button>
              <span className="text-xs text-zinc-500">Page {page} (cursor)</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500" htmlFor="ledger-page-size">
                Rows per page
              </label>
              <select
                id="ledger-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number.parseInt(event.target.value, 10));
                  setPage(1);
                  setPageCursors([null]);
                }}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        }
      >
        <table className="min-w-full border-collapse text-left text-sm" aria-label="Ledger transactions table">
          <caption className="sr-only">
            Ledger transactions with category, source, GST, reconciliation status, and actions.
          </caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="sticky top-0 z-10 py-2.5 pr-4 font-medium first:pl-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-zinc-100 transition hover:bg-zinc-50 ${
                  row.original.isHidden
                    ? "bg-zinc-200/70 opacity-80"
                    : !row.original.matched
                      ? "bg-zinc-100/55"
                      : "bg-white"
                } focus-within:bg-zinc-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
                tabIndex={0}
                aria-label={`Open details for transaction ${row.original.id}`}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest("button, input, select, a")) {
                    return;
                  }

                  openTransactionDetails(row.original.idNumeric);
                }}
                onKeyDown={(event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest("button, input, select, a")) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openTransactionDetails(row.original.idNumeric);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-2.5 pr-4 align-top first:pl-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 px-4">
                  <EmptyState
                    title={isFirstRunEmpty ? "Connect a data source to start" : "No transactions found"}
                    description={
                      isFirstRunEmpty
                        ? "Upload CSV, connect Razorpay, or connect your bank feed to populate the ledger."
                        : "Try changing filters or date range."
                    }
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataTable>
    </>
  );
}
