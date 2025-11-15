import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { getRevenueSnapshot } from '@/services/dashboardService';

interface RevenueSnapshotWidgetProps {
  config: WidgetConfig;
  timeRange: string;
  employeeId?: string;
  onRefresh?: () => void;
}

export const RevenueSnapshotWidget: React.FC<RevenueSnapshotWidgetProps> = ({
  config,
  timeRange,
  employeeId,
  onRefresh,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['revenue-snapshot', timeRange, employeeId],
    queryFn: () => getRevenueSnapshot(timeRange, employeeId),
    staleTime: 2 * 60 * 1000,
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
      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <h3 className="text-3xl font-bold mt-1">
                ₹{data.totalRevenue.toLocaleString('en-IN')}
              </h3>
            </div>
            <div className={`p-3 rounded-full ${
              data.trend >= 0 ? 'bg-success/20' : 'bg-destructive/20'
            }`}>
              {data.trend >= 0 ? (
                <TrendingUp className="h-6 w-6 text-success" />
              ) : (
                <TrendingDown className="h-6 w-6 text-destructive" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target Progress</span>
              <span className="font-medium">{data.progress.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, data.progress)} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Target: ₹{data.targetRevenue.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              {data.trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-sm font-medium ${
                data.trend >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {data.trend >= 0 ? '+' : ''}{data.trend.toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">vs previous period</span>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

