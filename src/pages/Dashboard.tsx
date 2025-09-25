import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TodoPlanner } from '@/components/tasks/TodoPlanner';
import { IntegratedDailyReport } from '@/components/reports/IntegratedDailyReport';
import { VisitScheduler } from '@/components/scheduling/VisitScheduler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, FileText, Calendar, BarChart3, Users, Download, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teamReports, setTeamReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Check if user is admin or HR (manager)
  const canViewTeamReports = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    if (canViewTeamReports) {
      fetchTeamReports();
    }
  }, [canViewTeamReports]);

  const fetchTeamReports = async () => {
    setLoading(true);
    try {
      // Get reports from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles!inner(full_name, role)
        `)
        .eq('report_type', 'team_performance')
        .gte('generated_at', sevenDaysAgo.toISOString())
        .order('generated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching team reports:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch team reports',
          variant: 'destructive'
        });
      } else {
        setTeamReports(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportTeamReports = () => {
    const csvContent = [
      ['Date', 'Employee', 'Role', 'Leads Registered', 'Leads Called', 'Follow Ups', 'Inventories Found', 'Site Visits', 'Agent Calls', 'Developer Calls'].join(','),
      ...teamReports.map(report => {
        const data = report.data || {};
        return [
          new Date(report.generated_at).toLocaleDateString(),
          report.profiles?.full_name || 'Unknown',
          report.profiles?.role || 'Unknown',
          data.leads_registered || 0,
          data.leads_called || 0,
          data.follow_ups || 0,
          data.inventories_found || 0,
          (data.primary_sites_visited || 0) + (data.client_visit || 0),
          data.calls_to_agents || 0,
          data.calls_to_developers || 0
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team_reports_${format(new Date(), 'yyyy_MM_dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getReportScore = (data: any) => {
    let score = 0;
    const metrics = [
      { key: 'leads_registered', weight: 2 },
      { key: 'leads_called', weight: 2 },
      { key: 'follow_ups', weight: 1 },
      { key: 'inventories_found', weight: 1 },
      { key: 'calls_to_agents', weight: 1 },
      { key: 'calls_to_developers', weight: 1 }
    ];

    metrics.forEach(metric => {
      if (data[metric.key] > 0) {
        score += metric.weight;
      }
    });

    return score;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">CRM Dashboard</h1>
          <p className="text-muted-foreground">Manage your daily tasks, reports, and visits</p>
        </div>

        <Tabs defaultValue="planner" className="w-full">
          <TabsList className={`grid w-full ${canViewTeamReports ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="planner" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Planner
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            {canViewTeamReports && (
              <TabsTrigger value="team-reports" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Reports
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="planner">
            <TodoPlanner />
          </TabsContent>
          
          <TabsContent value="reports">
            <IntegratedDailyReport />
          </TabsContent>
          
          <TabsContent value="visits">
            <VisitScheduler />
          </TabsContent>
          
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>View your performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {canViewTeamReports && (
            <TabsContent value="team-reports" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Reports from Team</h2>
                  <p className="text-muted-foreground">Monitor daily reports and performance from all team members</p>
                </div>
                <Button onClick={exportTeamReports} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Reports
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{teamReports.length}</div>
                    <p className="text-xs text-muted-foreground">Reports This Week</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {teamReports.filter(r => new Date(r.generated_at).toDateString() === new Date().toDateString()).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Reports Today</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {Math.round(teamReports.reduce((acc, r) => acc + getReportScore(r.data || {}), 0) / Math.max(teamReports.length, 1))}
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Performance Score</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recent Team Reports (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : teamReports.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Leads</TableHead>
                            <TableHead>Calls</TableHead>
                            <TableHead>Follow-ups</TableHead>
                            <TableHead>Inventories</TableHead>
                            <TableHead>Visits</TableHead>
                            <TableHead>Performance</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamReports.map((report) => {
                            const data = report.data || {};
                            const reportDate = new Date(report.generated_at);
                            const isToday = new Date().toDateString() === reportDate.toDateString();
                            const performanceScore = getReportScore(data);
                            
                            return (
                              <TableRow key={report.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {reportDate.toLocaleDateString()}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {report.profiles?.full_name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{report.profiles?.role || 'Unknown'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>{data.leads_registered || 0}</span>
                                    {(data.leads_registered || 0) > 0 && (
                                      <Badge className="bg-green-100 text-green-800 text-xs px-1">R</Badge>
                                    )}
                                    <span className="text-muted-foreground">/</span>
                                    <span>{data.leads_called || 0}</span>
                                    {data.leads_called_status && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs px-1">C</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {(data.calls_to_agents || 0) + (data.calls_to_developers || 0)}
                                    {(data.calls_to_agents_status || data.calls_to_developers_status) && (
                                      <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {data.follow_ups || 0}
                                    {data.follow_ups_status && (
                                      <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {data.inventories_found || 0}
                                    {data.inventories_found_status && (
                                      <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{(data.primary_sites_visited || 0) + (data.client_visit || 0)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={performanceScore >= 6 ? 'default' : performanceScore >= 3 ? 'secondary' : 'destructive'}
                                    >
                                      {performanceScore}/8
                                    </Badge>
                                    {performanceScore < 3 && (
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={isToday ? 'default' : 'secondary'}>
                                    {isToday ? 'Today' : 'Submitted'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No team reports found for the last 7 days.</p>
                      <p className="text-sm">Team members need to submit their daily reports.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;