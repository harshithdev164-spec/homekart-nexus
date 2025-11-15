import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getTodayTasks } from '@/services/dashboardService';
import { format } from 'date-fns';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TasksWidgetProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
  onTaskClick?: (taskId: string) => void;
}

export const TasksWidget: React.FC<TasksWidgetProps> = ({
  config,
  employeeId,
  onRefresh,
  onTaskClick,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['today-tasks', employeeId],
    queryFn: () => getTodayTasks(employeeId),
    staleTime: 1 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={error}
      onRefresh={handleRefresh}
    >
      {data && data.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onTaskClick?.(task.id)}
            >
              <div className="mt-0.5">
                {getPriorityIcon(task.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {task.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No tasks for today
        </div>
      )}
    </WidgetContainer>
  );
};

