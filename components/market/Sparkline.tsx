/**
 * PROMPT 62: Sparkline component for 7-day trend visualization
 * 
 * Lightweight SVG sparkline without external chart libraries
 */

"use client";

import { useMemo } from "react";

type SparklineProps = {
  data: Array<{ date: string; score: number }>;
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({ data, width = 100, height = 30, className }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return null;

    // Normalize data to fit in viewBox
    const scores = data.map((d) => d.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore || 1; // Avoid division by zero

    // Generate path
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.score - minScore) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    });

    return points.join(" ");
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-xs text-muted-foreground ${className}`} style={{ width, height }}>
        —
      </div>
    );
  }

  const scores = data.map((d) => d.score);
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const isPositive = lastScore >= firstScore;
  const color = isPositive ? "#10b981" : "#ef4444"; // green-500 : red-500

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d={path || ""}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

