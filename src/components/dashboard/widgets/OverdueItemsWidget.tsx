import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getOverdueItems } from '@/services/dashboardService';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckSquare, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OverdueItemsWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
  onTaskClick?: (taskId: string) => void;
  onLeadClick?: (leadId: string) => void;
}

export const OverdueItemsWidget: React.FC<OverdueItemsWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
  onTaskClick,
  onLeadClick,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['overdue-items', employeeId],
    queryFn: () => getOverdueItems(employeeId),
    staleTime: 1 * 60 * 1000,
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
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">
              Tasks ({data.tasks.length})
            </TabsTrigger>
            <TabsTrigger value="followups">
              Follow-ups ({data.followUps.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="mt-4">
            {data.tasks.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No overdue tasks
              </div>
            )}
          </TabsContent>
          <TabsContent value="followups" className="mt-4">
            {data.followUps.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.followUps.map((followUp) => (
                  <div
                    key={followUp.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onLeadClick?.(followUp.id)}
                  >
                    <Clock className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{followUp.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(followUp.nextFollowUp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No overdue follow-ups
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </WidgetContainer>
  );
};

