type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  return (
    <span className={className}>
      Lev
      <span className={compact ? "text-orange-500" : "ml-[1px] text-orange-500"}>.</span>
    </span>
  );
}
