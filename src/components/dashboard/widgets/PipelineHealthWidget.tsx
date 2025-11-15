import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { getPipelineHealth } from '@/services/dashboardService';
import { Progress } from '@/components/ui/progress';

interface PipelineHealthWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
}

export const PipelineHealthWidget: React.FC<PipelineHealthWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pipeline-health', employeeId],
    queryFn: () => getPipelineHealth(employeeId),
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
              <h3 className="text-2xl font-bold mt-1">
                ₹{data.totalPipelineValue.toLocaleString('en-IN')}
              </h3>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deals in Progress</p>
              <h3 className="text-2xl font-bold mt-1">{data.dealsInProgress}</h3>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Win Probability</span>
              <Badge variant="outline">{data.averageWinProbability}%</Badge>
            </div>
            <Progress value={data.averageWinProbability} className="h-2" />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Pipeline Stages</p>
            <div className="space-y-2">
              {data.stages.slice(0, 3).map((stage, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage.count}</span>
                    <span className="text-muted-foreground">
                      ₹{(stage.value / 100000).toFixed(1)}L
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

