type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const iconClass = compact ? "h-[0.92em] w-[0.86em]" : "h-[1.04em] w-[0.98em]";

  return (
    <span
      className={`inline-flex items-center gap-[0.34em] tracking-[-0.03em] text-white ${className}`}
      style={{ fontWeight: 560 }}
    >
      <svg viewBox="0 0 84 84" aria-hidden="true" className={`${iconClass} translate-y-[0.01em] text-white/92`}>
        <path
          d="M7.6 76h9.5a8.4 8.4 0 0 0 8.1-6.4l9.2-36.6-8.6-16.7L5.1 64.3C2.8 69.8 6.8 76 12.8 76H7.6Z"
          fill="currentColor"
        />
        <path
          d="M27.8 9.8h12.7a8.4 8.4 0 0 1 7.5 4.6l30 56.3c2.1 4-0.8 8.9-5.4 8.9H61.7a9 9 0 0 1-8-4.9l-30.7-58.8c-2.1-4 .8-8.9 4.8-8.9Z"
          fill="currentColor"
        />
      </svg>
      <span>Accrual</span>
    </span>
  );
}
