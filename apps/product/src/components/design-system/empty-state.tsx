type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({
  title = "No data yet",
  description = "When data arrives, it will appear here."
}: EmptyStateProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}
