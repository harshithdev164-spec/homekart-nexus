import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getCommissionData } from '@/services/dashboardService';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CommissionTrackerWidgetProps {
  config: WidgetConfig;
  timeRange: string;
  employeeId?: string;
  onRefresh?: () => void;
}

export const CommissionTrackerWidget: React.FC<CommissionTrackerWidgetProps> = ({
  config,
  timeRange,
  employeeId,
  onRefresh,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['commission-data', timeRange, employeeId],
    queryFn: () => getCommissionData(timeRange, employeeId),
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const totalCommission = data?.reduce((sum, item) => sum + item.totalCommission, 0) || 0;
  const totalPaid = data?.reduce((sum, item) => sum + item.paid, 0) || 0;
  const totalPending = data?.reduce((sum, item) => sum + item.pending, 0) || 0;

  return (
    <WidgetContainer
      config={config}
      loading={isLoading}
      error={error}
      onRefresh={handleRefresh}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="text-lg font-bold">₹{(totalCommission / 1000).toFixed(1)}K</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/10">
              <p className="text-xs text-muted-foreground mb-1">Paid</p>
              <p className="text-lg font-bold text-success">₹{(totalPaid / 1000).toFixed(1)}K</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10">
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-lg font-bold text-warning">₹{(totalPending / 1000).toFixed(1)}K</p>
            </div>
          </div>

          {data.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data.slice(0, 5).map((item) => (
                <div key={item.agentId} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.agentName}</p>
                    <p className="text-xs text-muted-foreground">{item.deals} deals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">₹{(item.totalCommission / 1000).toFixed(1)}K</p>
                    <Badge variant="outline" className="text-xs">
                      {item.pending > 0 ? 'Pending' : 'Paid'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

