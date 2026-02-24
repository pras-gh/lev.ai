import type { ReactNode } from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";

type AlertSeverity = "critical" | "warning" | "info";

type AlertCardProps = {
  severity: AlertSeverity;
  message: string;
  ctaLabel?: string;
  onSelect?: () => void;
  selected?: boolean;
};

const STYLE_MAP: Record<AlertSeverity, { card: string; icon: ReactNode }> = {
  critical: {
    card: "border-red-300/70 bg-red-50/95 text-red-900",
    icon: <OctagonAlert className="h-4 w-4 text-red-600" />
  },
  warning: {
    card: "border-amber-300/70 bg-amber-50/95 text-amber-900",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />
  },
  info: {
    card: "border-zinc-300 bg-zinc-100 text-zinc-800",
    icon: <Info className="h-4 w-4 text-zinc-600" />
  }
};

export function AlertCard({ severity, message, ctaLabel, onSelect, selected = false }: AlertCardProps) {
  const style = STYLE_MAP[severity];

  return (
    <article
      className={`rounded-[var(--radius-md)] border p-3 transition ${style.card} ${
        selected ? "ring-2 ring-[var(--accent)]" : ""
      } ${onSelect ? "cursor-pointer hover:-translate-y-0.5" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (onSelect && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {style.icon}
          <p className="text-sm font-medium">{message}</p>
        </div>
        {ctaLabel ? <span className="text-xs text-[var(--subtle)]">{ctaLabel}</span> : null}
      </div>
    </article>
  );
}
