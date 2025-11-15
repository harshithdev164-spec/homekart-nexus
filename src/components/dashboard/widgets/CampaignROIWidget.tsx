import React from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getCampaignMetrics } from '@/services/dashboardService';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CampaignROIWidgetProps {
  config: WidgetConfig;
  timeRange: string;
  onRefresh?: () => void;
}

export const CampaignROIWidget: React.FC<CampaignROIWidgetProps> = ({
  config,
  timeRange,
  onRefresh,
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign-metrics', timeRange],
    queryFn: () => getCampaignMetrics(timeRange),
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
      {data && data.length > 0 ? (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {data.map((campaign) => (
            <div key={campaign.campaignId} className="p-3 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{campaign.type}</p>
                </div>
                <Badge variant={campaign.roi > 0 ? 'default' : 'destructive'}>
                  {campaign.roi > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {campaign.roi.toFixed(1)}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Sent</p>
                  <p className="font-medium">{campaign.sent}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Opened</p>
                  <p className="font-medium">{campaign.opened}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clicked</p>
                  <p className="font-medium">{campaign.clicked}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Converted</p>
                  <p className="font-medium">{campaign.converted}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No campaign data available
        </div>
      )}
    </WidgetContainer>
  );
};

