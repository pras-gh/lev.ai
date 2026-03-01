import type { ReactNode } from "react";

type MetricRowProps = {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
};

const DELTA_TONE_CLASS = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  neutral: "text-zinc-500"
} as const;

export function MetricRow({
  label,
  value,
  delta,
  deltaTone = "neutral"
}: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2 first:border-t-0 first:pt-0">
      <span className="text-[13px] text-[var(--subtle)]">{label}</span>
      <div className="text-right">
        <p className="text-sm font-medium text-[var(--text)]">{value}</p>
        {delta ? <p className={`text-[12px] ${DELTA_TONE_CLASS[deltaTone]}`}>{delta}</p> : null}
      </div>
    </div>
  );
}
