import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Target, AlertTriangle, Brain, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface AIInsight {
  type: 'high-value' | 'stale-leads' | 'conversion-opportunity' | 'team-performance';
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  count?: number;
}

export const AIDashboardWidget: React.FC = () => {
  const { profile } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      generateAIInsights();
    }
  }, [profile]);

  const generateAIInsights = async () => {
    setLoading(true);
    try {
      // Get recent leads data for analysis
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!leads) return;

      const currentInsights: AIInsight[] = [];

      // High-value leads analysis
      const highValueLeads = leads.filter(lead => 
        lead.budget_max && lead.budget_max > 10000000 && lead.status === 'new'
      );

      if (highValueLeads.length > 0) {
        currentInsights.push({
          type: 'high-value',
          title: `${highValueLeads.length} High-Value Leads Detected`,
          description: `Premium leads with budgets over ₹1Cr are waiting for immediate attention`,
          action: 'Prioritize Outreach',
          priority: 'high',
          count: highValueLeads.length
        });
      }

      // Stale leads analysis
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleLeads = leads.filter(lead => {
        const createdAt = new Date(lead.created_at);
        const lastContacted = lead.last_contacted ? new Date(lead.last_contacted) : createdAt;
        return lastContacted < oneWeekAgo && lead.status !== 'closed_won' && lead.status !== 'closed_lost';
      });

      if (staleLeads.length > 0) {
        currentInsights.push({
          type: 'stale-leads',
          title: `${staleLeads.length} Leads Need Follow-up`,
          description: `Leads haven't been contacted in over a week. Risk of conversion loss is high`,
          action: 'Schedule Follow-ups',
          priority: 'medium',
          count: staleLeads.length
        });
      }

      // Conversion opportunity analysis
      const qualifiedLeads = leads.filter(lead => 
        lead.status === 'qualified' || lead.status === 'contacted'
      );

      if (qualifiedLeads.length > 0) {
        currentInsights.push({
          type: 'conversion-opportunity',
          title: `${qualifiedLeads.length} Ready for Conversion`,
          description: `Qualified leads showing strong interest. Perfect time to close deals`,
          action: 'Push for Closure',
          priority: 'high',
          count: qualifiedLeads.length
        });
      }

      // Team performance insight (for admins/managers)
      if (profile?.role === 'admin' || profile?.role === 'manager') {
        const assignedLeads = leads.filter(lead => lead.assigned_to);
        const unassignedLeads = leads.filter(lead => !lead.assigned_to);

        if (unassignedLeads.length > assignedLeads.length * 0.3) {
          currentInsights.push({
            type: 'team-performance',
            title: `${unassignedLeads.length} Unassigned Leads`,
            description: `Too many leads are unassigned. This may impact team productivity`,
            action: 'Redistribute Leads',
            priority: 'medium',
            count: unassignedLeads.length
          });
        }
      }

      setInsights(currentInsights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      default: return <Target className="h-4 w-4 text-green-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const handleInsightAction = (insight: AIInsight) => {
    // Navigate to relevant sections based on insight type
    switch (insight.type) {
      case 'high-value':
      case 'stale-leads':
      case 'conversion-opportunity':
        window.location.href = '/leads';
        break;
      case 'team-performance':
        window.location.href = '/team';
        break;
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Business Insights
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Smart recommendations to boost your performance
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={generateAIInsights}
            disabled={loading}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? 'Analyzing...' : 'Refresh Insights'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 bg-gradient-to-r from-background to-muted/20 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleInsightAction(insight)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(insight.priority)}
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                  </div>
                  <Badge className={getPriorityColor(insight.priority)}>
                    {insight.priority}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3">
                  {insight.description}
                </p>
                
                <div className="flex items-center justify-between">
                  {insight.count && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{insight.count} leads</span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {insight.action}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium text-muted-foreground mb-2">All Looking Good!</h3>
            <p className="text-sm text-muted-foreground">
              No urgent insights at the moment. Keep up the great work!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};