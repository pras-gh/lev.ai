type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-red-300/55 bg-red-100/70 p-4 text-red-900">
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-400/60 bg-white/75 px-3 py-1 text-xs font-medium text-red-900"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
