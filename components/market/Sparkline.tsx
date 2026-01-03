/**
 * PROMPT 62: Sparkline component for 7-day trend visualization
 * 
 * Lightweight SVG sparkline without external chart libraries
 */

"use client";

import { useMemo } from "react";

type SparklineProps = {
  data?: Array<{ date: string; score: number }>;
  values?: number[];
  width?: number;
  height?: number;
  className?: string;
  trend?: "up" | "down" | "neutral";
};

export function Sparkline({ data, values, width = 100, height = 30, className, trend }: SparklineProps) {
  // Support both APIs: data (legacy) and values (new)
  const scores = values || (data ? data.map((d) => d.score) : []);
  
  const path = useMemo(() => {
    if (scores.length < 2) return null;

    // Normalize data to fit in viewBox
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore || 1; // Avoid division by zero

    // Generate path
    const points = scores.map((score, i) => {
      const x = (i / (scores.length - 1)) * width;
      const y = height - ((score - minScore) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    });

    return points.join(" ");
  }, [scores, width, height]);

  if (scores.length < 2) {
    return (
      <div className={`flex items-center justify-center text-xs text-muted-foreground ${className}`} style={{ width, height }}>
        —
      </div>
    );
  }

  // Determine color: use trend prop if provided, otherwise calculate from data
  let color = "#6b7280"; // gray-500 (neutral)
  if (trend) {
    if (trend === "up") color = "#16a34a"; // green-600
    else if (trend === "down") color = "#dc2626"; // red-600
  } else {
    // Fallback: calculate from first/last score
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const isPositive = lastScore >= firstScore;
    color = isPositive ? "#10b981" : "#ef4444"; // green-500 : red-500
  }

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

