type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const iconClass = compact ? "h-[0.9em] w-[0.68em]" : "h-[1.02em] w-[0.76em]";

  return (
    <span
      className={`inline-flex items-center gap-[0.34em] tracking-[-0.03em] text-white ${className}`}
      style={{ fontWeight: 560 }}
    >
      <svg viewBox="0 0 48 64" aria-hidden="true" className={`${iconClass} translate-y-[0.02em] text-white/92`}>
        <path
          d="M9.3 59.6 20.4 8.7c.4-2 2.2-3.4 4.3-3.4h2.6c2.2 0 3.8 2 3.3 4.1L18.8 56.7a3.7 3.7 0 0 1-3.6 2.9H9.3Z"
          fill="currentColor"
        />
        <path
          d="M21.9 4.4h10.3c1.8 0 3.4 1 4.2 2.7l16.3 35c1.1 2.4-.6 5-3.2 5H39.4a4.4 4.4 0 0 1-4-2.5L18.2 9.1a3.4 3.4 0 0 1 3.7-4.7Z"
          fill="currentColor"
        />
      </svg>
      <span>Accrual</span>
    </span>
  );
}
