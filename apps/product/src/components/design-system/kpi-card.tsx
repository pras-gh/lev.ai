import type { ReactNode } from "react";
import { TrendMiniChart } from "@/components/design-system/trend-mini-chart";

type KpiCardProps = {
  title: string;
  value: string;
  icon?: ReactNode;
  subtitle?: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  trend?: number[];
  footer?: ReactNode;
  calmRefresh?: boolean;
};

const DELTA_TONE_CLASS = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  neutral: "text-zinc-500"
} as const;

export function KpiCard({
  title,
  value,
  icon,
  subtitle,
  delta,
  deltaTone = "neutral",
  trend,
  footer,
  calmRefresh = false
}: KpiCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] uppercase tracking-[0.12em] text-[var(--subtle)]">{title}</p>
        {icon ? <span className="text-[var(--subtle)]">{icon}</span> : null}
      </div>

      <p className="mt-3 text-[clamp(2.75rem,4vw,4rem)] leading-none tracking-tight text-[var(--text)]">{value}</p>

      <div className="mt-2 min-h-5">
        {subtitle ? <p className="text-[13px] text-[var(--subtle)]">{subtitle}</p> : null}
        {delta ? <p className={`text-[12px] ${DELTA_TONE_CLASS[deltaTone]}`}>{delta}</p> : null}
      </div>

      {trend && trend.length > 1 ? (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-black/5 p-2">
          <TrendMiniChart points={trend} width={180} height={36} />
        </div>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}

      {calmRefresh ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <span className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/28 to-transparent [animation:calm-shimmer_1.8s_ease-in-out_infinite]" />
        </span>
      ) : null}
    </article>
  );
}
