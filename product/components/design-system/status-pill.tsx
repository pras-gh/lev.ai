import type { ReactNode } from "react";

type StatusPillTone = "healthy" | "syncing" | "issues" | "neutral";

type StatusPillProps = {
  tone?: StatusPillTone;
  children: ReactNode;
  className?: string;
};

const TONE_CLASS: Record<StatusPillTone, string> = {
  healthy: "border-white/22 bg-white/10 text-zinc-200",
  syncing: "border-zinc-300/45 bg-zinc-200/15 text-zinc-100",
  issues: "border-zinc-200/65 bg-zinc-300/20 text-zinc-50",
  neutral: "border-white/20 bg-white/10 text-zinc-200"
};

export function StatusPill({ tone = "neutral", children, className }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs ${TONE_CLASS[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
