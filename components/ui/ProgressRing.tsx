import clsx from "clsx";

export function ProgressRing({
  value,
  size = 64,
  stroke = 8,
  label,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg width={size} height={size} className="text-muted">
        <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} r={radius} cx={size / 2} cy={size / 2} className="opacity-20" />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          className={clsx("transition-all duration-300", value >= 70 ? "text-emerald-500" : value >= 40 ? "text-amber-500" : "text-red-500")}
          strokeLinecap="round"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-foreground text-sm font-semibold"
        >
          {Math.round(value)}%
        </text>
      </svg>
      {label ? <div className="text-xs text-muted-foreground">{label}</div> : null}
    </div>
  );
}


