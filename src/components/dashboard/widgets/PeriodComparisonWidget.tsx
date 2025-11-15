import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getPeriodComparison } from '@/services/dashboardService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PeriodComparisonWidgetProps {
  config: WidgetConfig;
  timeRange: string;
  employeeId?: string;
  onRefresh?: () => void;
}

export const PeriodComparisonWidget: React.FC<PeriodComparisonWidgetProps> = ({
  config,
  timeRange,
  employeeId,
  onRefresh,
}) => {
  const revenueComp = useQuery({
    queryKey: ['period-comparison', 'revenue', timeRange, employeeId],
    queryFn: () => getPeriodComparison('revenue', timeRange, employeeId),
    staleTime: 5 * 60 * 1000,
  });

  const leadsComp = useQuery({
    queryKey: ['period-comparison', 'leads', timeRange, employeeId],
    queryFn: () => getPeriodComparison('leads', timeRange, employeeId),
    staleTime: 5 * 60 * 1000,
  });

  const dealsComp = useQuery({
    queryKey: ['period-comparison', 'deals', timeRange, employeeId],
    queryFn: () => getPeriodComparison('deals', timeRange, employeeId),
    staleTime: 5 * 60 * 1000,
  });

  const activitiesComp = useQuery({
    queryKey: ['period-comparison', 'activities', timeRange, employeeId],
    queryFn: () => getPeriodComparison('activities', timeRange, employeeId),
    staleTime: 5 * 60 * 1000,
  });

  const comparisons = [
    { metric: 'revenue', ...revenueComp },
    { metric: 'leads', ...leadsComp },
    { metric: 'deals', ...dealsComp },
    { metric: 'activities', ...activitiesComp },
  ];

  const handleRefresh = () => {
    revenueComp.refetch();
    leadsComp.refetch();
    dealsComp.refetch();
    activitiesComp.refetch();
    onRefresh?.();
  };

  const isLoading = comparisons.some((c) => c.isLoading);
  const hasError = comparisons.some((c) => c.error);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={hasError ? new Error('Failed to load comparison data') : null}
      onRefresh={handleRefresh}
    >
      <div className="grid grid-cols-2 gap-4">
        {comparisons.map(({ metric, data }) => {
          if (!data) return null;
          return (
            <Card key={metric} className="p-3">
              <CardContent className="p-0">
                <p className="text-xs text-muted-foreground mb-2 capitalize">{metric}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold">{data.current.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      vs {data.previous.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(data.trend)}
                    <span
                      className={`text-sm font-medium ${
                        data.trend === 'up'
                          ? 'text-success'
                          : data.trend === 'down'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {data.changePercent >= 0 ? '+' : ''}
                      {data.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </WidgetContainer>
  );
};

