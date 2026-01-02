"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import type { Lang } from '@/src/lib/i18n';

type FinancialChartsProps = {
  data: Array<{
    year: number;
    revenue: number | null;
    profit: number | null;
    employees: number | null;
  }>;
  currency: string;
  lang: Lang;
};

export function FinancialCharts({ data, currency, lang }: FinancialChartsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">
          {lang === 'ro' ? 'Tendințe financiare' : 'Financial Trends'}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {lang === 'ro' ? 'Nu există date disponibile' : 'No data available'}
        </p>
      </div>
    );
  }

  // Sort by year and filter out null values for cleaner chart
  const chartData = data
    .filter(d => d.revenue || d.profit)
    .sort((a, b) => a.year - b.year)
    .map(d => ({
      year: d.year,
      revenue: d.revenue ? Number(d.revenue) : null,
      profit: d.profit ? Number(d.profit) : null,
      employees: d.employees ? Number(d.employees) : null,
    }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">
          {lang === 'ro' ? 'Tendințe financiare' : 'Financial Trends'}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {lang === 'ro' ? 'Nu există date valide disponibile' : 'No valid data available'}
        </p>
      </div>
    );
  }

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat(lang === 'ro' ? 'ro-RO' : 'en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: value > 1000000 ? 'compact' : 'standard',
      compactDisplay: 'short'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(lang === 'ro' ? 'ro-RO' : 'en-GB').format(value);
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">
        {lang === 'ro' ? 'Tendințe financiare' : 'Financial Trends'}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {lang === 'ro' ? 'Evoluția veniturilor, profitului și angajaților' : 'Revenue, profit, and employee trends'}
      </p>
      
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="year" 
              className="text-xs text-muted-foreground"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs text-muted-foreground"
              tick={{ fill: 'currentColor' }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs text-muted-foreground"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
              formatter={(value: any, name?: string) => {
                if (name === 'employees') return [formatNumber(value), lang === 'ro' ? 'Angajați' : 'Employees'];
                if (name === 'revenue') return [formatMoney(value), lang === 'ro' ? 'Venituri' : 'Revenue'];
                if (name === 'profit') return [formatMoney(value), lang === 'ro' ? 'Profit' : 'Profit'];
                return [value, name || ''];
              }}
              labelFormatter={(label) => `${lang === 'ro' ? 'An' : 'Year'}: ${label}`}
            />
            <Legend 
              wrapperStyle={{ fontSize: '0.75rem' }}
              formatter={(value) => {
                if (value === 'revenue') return lang === 'ro' ? 'Venituri' : 'Revenue';
                if (value === 'profit') return lang === 'ro' ? 'Profit' : 'Profit';
                if (value === 'employees') return lang === 'ro' ? 'Angajați' : 'Employees';
                return value;
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="profit"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="employees"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
