import type { ReactNode } from "react";

type DataTableProps = {
  title: string;
  meta?: string;
  error?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function DataTable({ title, meta, error, children, footer }: DataTableProps) {
  return (
    <section className="ui-surface-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {meta ? <p className="text-xs text-[var(--subtle)]">{meta}</p> : null}
      </div>

      {error ? <div className="mb-3">{error}</div> : null}

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]">
        {children}
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
