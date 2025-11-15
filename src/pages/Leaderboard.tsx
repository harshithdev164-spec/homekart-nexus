import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Medal, Target, TrendingUp, Users } from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';

type TimeRange = 'week' | 'month' | 'allTime';
type MetricType = 'calls' | 'leads' | 'visits' | 'inventories';

interface LeaderboardEntry {
  rank: number;
  name: string;
  metric: number;
  trend: number;
  badge?: string;
}

const Leaderboard: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [metricType, setMetricType] = useState<MetricType>('calls');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange, metricType]);

  const toNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return startOfMonth(now);
      case 'allTime':
        return new Date('2020-01-01');
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const startDate = getDateRange();
      const { data: reports, error } = await supabase
        .from('reports')
        .select('*, profiles!reports_generated_by_fkey(full_name)')
        .eq('report_type', 'team_performance')
        .gte('generated_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching reports:', error);
        toast({ title: 'Error', description: 'Failed to fetch leaderboard data', variant: 'destructive' });
        return;
      }

      // Aggregate by employee
      const employeeStats = new Map<string, number>();
      reports?.forEach((report: any) => {
        const name = report.profiles?.full_name || 'Unknown';
        const data = report.data || {};
        
        let value = 0;
        if (metricType === 'calls') {
          value = toNumber(data.calls_to_agents);
        } else if (metricType === 'leads') {
          value = toNumber(data.leads_registered);
        } else if (metricType === 'visits') {
          value = toNumber(data.primary_sites_visited) + toNumber(data.client_visit);
        } else if (metricType === 'inventories') {
          value = toNumber(data.inventories_found);
        }

        employeeStats.set(name, (employeeStats.get(name) || 0) + value);
      });

      // Sort and rank
      const sorted = Array.from(employeeStats.entries())
        .sort((a, b) => b[1] - a[1])
        .map((entry, index) => ({
          rank: index + 1,
          name: entry[0],
          metric: entry[1],
          trend: index === 0 ? 5 : index <= 2 ? 2 : 0,
          badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : undefined,
        }));

      setLeaderboard(sorted);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to load leaderboard', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const metricLabels = {
    calls: 'Calls Made',
    leads: 'Leads Generated',
    visits: 'Site Visits',
    inventories: 'Inventories Found',
  };

  const metricIcons = {
    calls: '📞',
    leads: '👤',
    visits: '📍',
    inventories: '🏠',
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Team Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">Celebrate top performers and drive team engagement</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="allTime">All Time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calls">📞 Calls Made</SelectItem>
            <SelectItem value="leads">👤 Leads Generated</SelectItem>
            <SelectItem value="visits">📍 Site Visits</SelectItem>
            <SelectItem value="inventories">🏠 Inventories Found</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 3 - Featured */}
          <div className="lg:col-span-1">
            {leaderboard.slice(0, 3).map((entry) => (
              <Card
                key={entry.rank}
                className={`mb-4 border-l-4 ${
                  entry.rank === 1
                    ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20'
                    : entry.rank === 2
                    ? 'border-l-gray-400 bg-gray-50/50 dark:bg-gray-900/20'
                    : 'border-l-orange-600 bg-orange-50/50 dark:bg-orange-950/20'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{entry.badge}</div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{entry.name}</p>
                      <p className="text-2xl font-bold text-primary">{entry.metric}</p>
                      <p className="text-xs text-muted-foreground">{metricLabels[metricType]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rest of leaderboard - Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Complete Rankings
              </CardTitle>
              <CardDescription>{metricLabels[metricType]} Leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-8 text-center font-bold text-lg">#{entry.rank}</div>
                    <div className="flex-1">
                      <p className="font-medium">{entry.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{entry.metric}</p>
                      {entry.trend > 0 && (
                        <p className="text-xs text-success flex items-center gap-1 justify-end">
                          <TrendingUp className="h-3 w-3" /> +{entry.trend}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {leaderboard.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {leaderboard.slice(0, 4).map((entry) => (
          <Card key={entry.rank} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">#{entry.rank}</p>
                  <h3 className="text-lg font-bold truncate">{entry.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-2">{entry.metric}</p>
                </div>
                <div className="text-3xl">{entry.badge || '⭐'}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
