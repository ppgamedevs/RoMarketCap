export function Sparkline({
  values,
  width = 160,
  height = 36,
  trend,
}: {
  values: number[];
  width?: number;
  height?: number;
  trend?: "up" | "down" | "neutral";
}) {
  if (!values.length) return <span className="text-xs text-muted-foreground">N/A</span>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (width - 2) + 1;
      const y = height - 1 - ((v - min) / span) * (height - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Determine color based on trend
  let strokeColor = "currentColor";
  if (trend === "up") {
    strokeColor = "#16a34a"; // green-600
  } else if (trend === "down") {
    strokeColor = "#dc2626"; // red-600
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="sparkline">
      <polyline fill="none" stroke={strokeColor} strokeWidth="2" points={points} opacity="0.9" />
    </svg>
  );
}


