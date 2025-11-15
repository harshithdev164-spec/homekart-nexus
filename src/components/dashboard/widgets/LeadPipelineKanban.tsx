import React, { useState, useEffect } from 'react';
import { WidgetContainer } from '../WidgetContainer';
import { WidgetConfig } from '@/types/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { format } from 'date-fns';
import { User } from 'lucide-react';

interface LeadPipelineKanbanProps {
  config: WidgetConfig;
  employeeId?: string;
  onRefresh?: () => void;
  onLeadClick?: (leadId: string) => void;
}

const STAGES = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-pink-500' },
];

export const LeadPipelineKanban: React.FC<LeadPipelineKanbanProps> = ({
  config,
  employeeId,
  onRefresh,
  onLeadClick,
}) => {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchLeads();
  }, [employeeId]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select(`
          id,
          name,
          status,
          budget_min,
          budget_max,
          assigned_to,
          created_at,
          profiles!leads_assigned_to_fkey(full_name)
        `)
        .neq('status', 'closed_won')
        .neq('status', 'closed_lost')
        .order('created_at', { ascending: false })
        .limit(50);

      if (employeeId) {
        query = query.eq('assigned_to', employeeId);
      } else if (profile?.role !== 'admin' && profile?.role !== 'manager') {
        query = query.eq('assigned_to', profile?.id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLeads(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch leads'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLeads();
    onRefresh?.();
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter((lead) => lead.status === stage);
  };

  const toNumber = (value: any): number => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  return (
    <WidgetContainer
      config={config}
      loading={loading}
      error={error}
      onRefresh={handleRefresh}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-64">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <span className="font-medium text-sm">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stageLeads.length}
                </Badge>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {stageLeads.map((lead) => {
                  const budget = (toNumber(lead.budget_min) + toNumber(lead.budget_max)) / 2;
                  return (
                    <Card
                      key={lead.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onLeadClick?.(lead.id)}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-sm mb-1">{lead.name}</p>
                        {budget > 0 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            ₹{(budget / 100000).toFixed(1)}L
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{lead.profiles?.full_name || 'Unassigned'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(lead.created_at), 'MMM dd')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No leads
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetContainer>
  );
};

