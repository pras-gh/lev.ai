type TrendMiniChartProps = {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
};

function toPoints(points: number[], width: number, height: number): string {
  if (points.length === 0) {
    return "";
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export function TrendMiniChart({
  points,
  width = 140,
  height = 36,
  stroke = "var(--accent)",
  className
}: TrendMiniChartProps) {
  const chartPoints = toPoints(points, width, height);

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <polyline points={chartPoints} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
