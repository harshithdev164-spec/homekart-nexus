import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: any[];
  dataKeys: string[];
  xKey: string;
  height?: number;
  type?: 'line' | 'area';
  colors?: string[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  dataKeys,
  xKey,
  height = 300,
  type = 'line',
  colors = COLORS,
}) => {
  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        {dataKeys.map((key, index) => (
          <DataComponent
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={type === 'area' ? colors[index % colors.length] : undefined}
            fillOpacity={type === 'area' ? 0.6 : undefined}
            strokeWidth={2}
          />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

