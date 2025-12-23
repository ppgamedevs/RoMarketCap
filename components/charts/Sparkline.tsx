export function Sparkline({
  values,
  width = 160,
  height = 36,
}: {
  values: number[];
  width?: number;
  height?: number;
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

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="sparkline">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} opacity="0.9" />
    </svg>
  );
}


