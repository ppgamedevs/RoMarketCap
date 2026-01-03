/**
 * Market Cap Graph Component
 * 
 * Displays total market cap over time with percentage change
 * Similar to CoinMarketCap dashboard cards
 */

"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type MarketCapDataPoint = {
  date: string;
  totalMarketCap: number;
};

type MarketCapGraphProps = {
  lang?: "ro" | "en";
};

export function MarketCapGraph({ lang = "ro" }: MarketCapGraphProps) {
  const [data, setData] = useState<MarketCapDataPoint[]>([]);
  const [currentTotal, setCurrentTotal] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/market/stats");
        const json = await res.json();
        if (json.ok) {
          setData(json.history || []);
          setCurrentTotal(json.currentTotal || null);
          setChangePercent(json.changePercent || null);
        }
      } catch (error) {
        console.error("[MarketCapGraph] Error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentTotal) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(lang === "ro" ? "ro-RO" : "en-US", {
      style: "currency",
      currency: "RON",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {lang === "ro" ? "Market Cap Total" : "Total Market Cap"}
          </h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatCurrency(currentTotal)}</span>
            {changePercent !== null && (
              <span
                className={`text-sm font-medium ${
                  changePercent > 0 ? "text-green-600" : changePercent < 0 ? "text-red-600" : "text-muted-foreground"
                }`}
              >
                {changePercent > 0 ? "▲" : changePercent < 0 ? "▼" : ""}
                {changePercent > 0 ? "+" : ""}
                {changePercent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke="currentColor"
              strokeOpacity={0.2}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12, fill: "currentColor" }}
              stroke="currentColor"
              strokeOpacity={0.2}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => formatDate(label)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Line
              type="monotone"
              dataKey="totalMarketCap"
              stroke={changePercent && changePercent < 0 ? "#dc2626" : "#16a34a"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          {lang === "ro" ? "Nu există date istorice" : "No historical data"}
        </div>
      )}
    </div>
  );
}
