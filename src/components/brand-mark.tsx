type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const iconClass = compact ? "h-[0.94em] w-[0.8em]" : "h-[1.04em] w-[0.94em]";

  return (
    <span
      className={`inline-flex items-center gap-[0.3em] tracking-[-0.03em] text-white ${className}`}
      style={{ fontWeight: 560 }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" className={`${iconClass} translate-y-[0.01em] text-white/92`}>
        <path
          d="M32.8 10.2h17c2.6 0 5 1.4 6.2 3.7l35.7 70.8c2 4-.9 8.7-5.4 8.7H71.8c-2.7 0-5.1-1.5-6.3-3.8L27 16.9c-2.1-4 .8-8.9 5.8-8.9Z"
          fill="currentColor"
        />
        <path
          d="M8.8 93.4h15.6c3.2 0 6-2.2 6.8-5.2l14.2-53.6-8.9-18.2-28.3 70c-1.6 4 .9 7 4.6 7Z"
          fill="currentColor"
        />
      </svg>
      <span>Accrual</span>
    </span>
  );
}
