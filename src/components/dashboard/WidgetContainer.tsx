import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { WidgetConfig, WidgetSize } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface WidgetContainerProps {
  config: WidgetConfig;
  loading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onToggleSize?: () => void;
  children: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-3',
};

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  config,
  loading = false,
  error = null,
  onRefresh,
  onConfigure,
  onToggleSize,
  children,
  className,
}) => {
  if (!config.visible) return null;

  return (
    <div className={cn(sizeClasses[config.size], className)}>
      <Card className="h-full flex flex-col border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{config.title}</CardTitle>
              {config.description && (
                <CardDescription className="mt-1">{config.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onToggleSize && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleSize}
                  title="Toggle size"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              {onConfigure && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onConfigure}
                  title="Configure widget"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRefresh}
                  disabled={loading}
                  title="Refresh data"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-sm text-destructive mb-2">Error loading widget</p>
              <p className="text-xs text-muted-foreground">{error.message}</p>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} className="mt-2">
                  Retry
                </Button>
              )}
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </div>
  );
};

