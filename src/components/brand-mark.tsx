type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const iconClass = compact ? "h-[0.9em] w-[0.78em]" : "h-[1em] w-[0.9em]";

  return (
    <span
      className={`inline-flex items-center gap-[0.3em] tracking-[-0.03em] text-white ${className}`}
      style={{ fontWeight: 560 }}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className={`${iconClass} translate-y-[0.01em] text-white/88`}>
        <path
          d="M13 56 23 18"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29 14 51 56"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Accrual</span>
    </span>
  );
}
