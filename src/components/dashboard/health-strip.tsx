"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangle, IndianRupee, ShieldCheck, Wallet } from "lucide-react";
import { ErrorState } from "@/components/design-system";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { formatInr } from "@/lib/formatters";

export type LedgerPreset = "unmatched" | "itc_mismatch" | "gst_due";

type HealthMetrics = {
  cash_runway_months: number;
  gst_due_amount_next_7d: number;
  itc_mismatch_count: number;
  recon_match_pct: number;
  month_close_readiness_pct: number;
  compliance_confidence: number;
};

type HealthStripProps = {
  scopeQuery: string;
  activePreset: LedgerPreset | null;
  onPresetChange: (preset: LedgerPreset | null) => void;
};

const FALLBACK_METRICS: HealthMetrics = {
  cash_runway_months: 4.8,
  gst_due_amount_next_7d: 128400,
  itc_mismatch_count: 2,
  recon_match_pct: 86.2,
  month_close_readiness_pct: 91.1,
  compliance_confidence: 89.4
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

async function fetchHealthMetrics(scopeQuery: string): Promise<HealthMetrics> {
  const response = await fetchWithTimeout(`/api/metrics/health?${scopeQuery}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, `Metrics request failed (${response.status})`));
  }

  const json = (await response.json()) as Partial<HealthMetrics>;

  return {
    cash_runway_months: Number(json.cash_runway_months ?? FALLBACK_METRICS.cash_runway_months),
    gst_due_amount_next_7d: Number(
      json.gst_due_amount_next_7d ?? FALLBACK_METRICS.gst_due_amount_next_7d
    ),
    itc_mismatch_count: Number(json.itc_mismatch_count ?? FALLBACK_METRICS.itc_mismatch_count),
    recon_match_pct: Number(json.recon_match_pct ?? FALLBACK_METRICS.recon_match_pct),
    month_close_readiness_pct: Number(
      json.month_close_readiness_pct ?? FALLBACK_METRICS.month_close_readiness_pct
    ),
    compliance_confidence: Number(
      json.compliance_confidence ?? FALLBACK_METRICS.compliance_confidence
    )
  };
}

export function HealthStrip({ scopeQuery, activePreset, onPresetChange }: HealthStripProps) {
  const metricsQuery = useQuery({
    queryKey: ["metrics", "health", scopeQuery],
    queryFn: () => fetchHealthMetrics(scopeQuery),
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const metrics = metricsQuery.data ?? FALLBACK_METRICS;
  const isLoading = metricsQuery.isLoading;
  const isUsingFallback = metricsQuery.isError && Boolean(metricsQuery.data);
  const hasBlockingError = metricsQuery.isError && !metricsQuery.data;

  const unmatchedPct = useMemo(
    () => Math.max(0, Math.round((100 - metrics.recon_match_pct) * 10) / 10),
    [metrics.recon_match_pct]
  );

  const cards = [
    {
      key: "unmatched",
      title: "Unmatched",
      value: `${unmatchedPct}%`,
      subtitle: "Rows needing reconciliation",
      preset: "unmatched" as LedgerPreset,
      icon: AlertTriangle
    },
    {
      key: "itc_mismatch",
      title: "ITC mismatch",
      hint: "Input tax credit entries lacking invoice evidence or expected references.",
      value: String(metrics.itc_mismatch_count),
      subtitle: "Input credit evidence gaps",
      preset: "itc_mismatch" as LedgerPreset,
      icon: ShieldCheck
    },
    {
      key: "gst_due",
      title: "GST due (7d)",
      hint: "Estimated GST payable in the next 7 days based on current posted ledger.",
      value: formatInr(metrics.gst_due_amount_next_7d),
      subtitle: "Expected payable in next window",
      preset: "gst_due" as LedgerPreset,
      icon: IndianRupee
    },
    {
      key: "cash_runway",
      title: "Cash runway",
      value: `${metrics.cash_runway_months.toFixed(1)}m`,
      subtitle: "Months at current burn",
      icon: Wallet
    },
    {
      key: "close_readiness",
      title: "Close readiness",
      value: `${metrics.month_close_readiness_pct.toFixed(1)}%`,
      subtitle: "Month-end checklist coverage",
      icon: ShieldCheck
    },
    {
      key: "compliance_confidence",
      title: "Compliance confidence",
      value: `${metrics.compliance_confidence.toFixed(1)}%`,
      subtitle: "Data + rule confidence score",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="ui-surface-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Financial health snapshot</h2>
        <p className="text-xs text-[var(--subtle)]">
          {isLoading
            ? "Loading metrics..."
            : hasBlockingError
              ? "Metric issue"
            : isUsingFallback
              ? "Using fallback metrics"
              : "Live metrics"}
        </p>
      </div>
      {hasBlockingError ? (
        <ErrorState
          message={
            metricsQuery.error instanceof Error
              ? metricsQuery.error.message
              : "Failed to load health metrics"
          }
          onRetry={() => {
            void metricsQuery.refetch();
          }}
        />
      ) : null}
      {!hasBlockingError ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {cards.map((card) => {
            const isFilterCard = Boolean(card.preset);
            const isActive = card.preset ? activePreset === card.preset : false;
            const Icon = card.icon;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  if (!card.preset) {
                    return;
                  }

                  onPresetChange(isActive ? null : card.preset);
                }}
                aria-pressed={isFilterCard ? isActive : undefined}
                className={`rounded-xl border p-5 text-left shadow-[var(--shadow-soft)] transition ${
                  isFilterCard
                    ? isActive
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--accent)]"
                    : "cursor-default border-[var(--border)] bg-[var(--card)] text-[var(--text)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-medium uppercase tracking-[0.16em] ${isActive ? "text-[var(--muted)]" : "text-[var(--subtle)]"}`}>
                      {card.title}
                      {card.hint ? (
                        <abbr title={card.hint} className="ml-1 inline-block text-[10px] normal-case">
                          i
                        </abbr>
                      ) : null}
                    </p>
                    <p className="mt-2 text-[clamp(2rem,3vw,2.7rem)] font-semibold tracking-tight text-[var(--text)]">
                      {card.value}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--accent-soft)] p-2 text-[var(--text)]">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className={`mt-2 text-xs ${isActive ? "text-[var(--muted)]" : "text-[var(--subtle)]"}`}>{card.subtitle}</p>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
