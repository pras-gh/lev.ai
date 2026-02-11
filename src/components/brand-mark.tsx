type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const spacingClass = compact ? "ml-[0.03em]" : "ml-[0.05em]";

  return (
    <span
      className={`inline-flex items-baseline lowercase tracking-[-0.04em] text-white ${className}`}
      style={{ fontWeight: 560 }}
    >
      trai
      <span className={spacingClass} aria-hidden>
        {"\\"}
      </span>
    </span>
  );
}
