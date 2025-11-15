import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getRevenueSnapshot } from '@/services/dashboardService';
import { format, startOfDay, subDays } from 'date-fns';

interface RevenueChartWidgetProps {
  config: WidgetConfig;
  timeRange: string;
  employeeId?: string;
  onRefresh?: () => void;
}

export const RevenueChartWidget: React.FC<RevenueChartWidgetProps> = ({
  config,
  timeRange,
  employeeId,
  onRefresh,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['revenue-chart', timeRange, employeeId],
    queryFn: async () => {
      const now = new Date();
      let days = 7;
      if (timeRange === 'week') days = 7;
      else if (timeRange === 'month') days = 30;

      const dataPoints = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const snapshot = await getRevenueSnapshot('today', employeeId);
        dataPoints.push({
          date: format(date, 'MMM dd'),
          revenue: snapshot.totalRevenue / days, // Simplified - would need actual daily data
        });
      }
      return dataPoints;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={error}
      onRefresh={handleRefresh}
    >
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </WidgetContainer>
  );
};

