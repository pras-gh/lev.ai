type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading data..." }: LoadingStateProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
      {label}
    </div>
  );
}
