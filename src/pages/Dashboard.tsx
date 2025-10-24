import React, { useState, useEffect } from 'react';
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
  const [loadingTeamReports, setLoadingTeamReports] = useState(false);
  const [teamPlanners, setTeamPlanners] = useState<any[]>([]);
  const [loadingTeamPlanners, setLoadingTeamPlanners] = useState(false);
  
  // Performance metrics state
  const [performanceMetrics, setPerformanceMetrics] = useState([
    { name: 'Leads Called', value: 0, target: 10, weight: 20 },
    { name: 'Follow Ups', value: 0, target: 30, weight: 30 },
    { name: 'Site Visits', value: 0, target: 5, weight: 25 },
    { name: 'Calls to Agents', value: 0, target: 10, weight: 15 },
    { name: 'Inventories Found', value: 0, target: 15, weight: 10 },
  ]);

  // Check if user is admin or HR (manager)
  const canViewTeamReports = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    if (canViewTeamReports) {
      fetchTeamReports();
      fetchTeamPlanners();
    }
    if (profile) {
      fetchUserPerformance();
    }
  }, [canViewTeamReports, profile]);

  const fetchUserPerformance = async () => {
    if (!profile) return;
    
    try {
      const today = new Date();
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('generated_by', profile.id)
        .eq('report_type', 'team_performance')
        .gte('generated_at', format(today, 'yyyy-MM-dd'))
        .maybeSingle();

      if (data && data.data) {
        const reportData = data.data as any;
        setPerformanceMetrics([
          { name: 'Leads Called', value: reportData.leads_called || 0, target: 10, weight: 20 },
          { name: 'Follow Ups', value: reportData.follow_ups || 0, target: 30, weight: 30 },
          { name: 'Site Visits', value: (reportData.primary_sites_visited || 0) + (reportData.client_visit || 0), target: 5, weight: 25 },
          { name: 'Calls to Agents', value: reportData.calls_to_agents || 0, target: 10, weight: 15 },
          { name: 'Inventories Found', value: reportData.inventories_found || 0, target: 15, weight: 10 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const calculatePerformanceScore = () => {
    let score = 0;
    performanceMetrics.forEach(metric => {
      if (metric.value >= metric.target) {
        score += metric.weight;
      }
    });
    return score;
  };

  const fetchTeamReports = async () => {
    setLoadingTeamReports(true);
    try {
      // Get reports from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_generated_by_fkey(full_name, role)
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
      setLoadingTeamReports(false);
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

  const fetchTeamPlanners = async () => {
    setLoadingTeamPlanners(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name, role),
          creator_profile:profiles!tasks_created_by_fkey(full_name)
        `)
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .order('due_date', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching team planners:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch team planners',
          variant: 'destructive'
        });
      } else {
        setTeamPlanners(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingTeamPlanners(false);
    }
  };

  const exportTeamPlanners = () => {
    const csvContent = [
      ['Due Date', 'Task', 'Assigned To', 'Priority', 'Status', 'Created By'].join(','),
      ...teamPlanners.map(task => [
        task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : 'No date',
        `"${task.title}"`,
        task.assigned_profile?.full_name || 'Unknown',
        task.priority || 'medium',
        task.is_completed ? 'Completed' : 'Pending',
        task.creator_profile?.full_name || 'Unknown'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team_planners_${format(new Date(), 'yyyy_MM_dd')}.csv`;
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
    <div className="w-full max-w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM Dashboard</h1>
        <p className="text-muted-foreground">Manage your daily tasks, reports, and visits</p>
      </div>

      <Tabs defaultValue="planner" className="w-full">
        <TabsList className={`grid w-full ${canViewTeamReports ? 'grid-cols-6' : 'grid-cols-4'}`}>
          <TabsTrigger value="planner">Daily Planner</TabsTrigger>
          <TabsTrigger value="reports">Daily Report</TabsTrigger>
          <TabsTrigger value="visits">Site Visits</TabsTrigger>
          <TabsTrigger value="performance">My Performance</TabsTrigger>
          {canViewTeamReports && (
            <TabsTrigger value="team-reports">Team Reports</TabsTrigger>
          )}
          {canViewTeamReports && (
            <TabsTrigger value="team-planners">Team Planners</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="planner" className="space-y-0">
          <TodoPlanner />
        </TabsContent>

        <TabsContent value="reports" className="space-y-0">
          <IntegratedDailyReport />
        </TabsContent>

        <TabsContent value="visits" className="space-y-0">
          <VisitScheduler />
        </TabsContent>

        <TabsContent value="performance" className="space-y-0">
          <Card>
            <CardHeader>
              <CardTitle>Performance Score</CardTitle>
              <CardDescription>Based on your daily report metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Score</span>
                  <Badge variant="outline" className="text-lg">
                    {calculatePerformanceScore()}/100
                  </Badge>
                </div>
                <div className="space-y-2">
                  {performanceMetrics.map((metric) => (
                    <div key={metric.name} className="flex items-center justify-between">
                      <span className="text-sm">{metric.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{metric.value}</span>
                        <Badge variant={metric.value >= metric.target ? "default" : "secondary"}>
                          {metric.value >= metric.target ? "✓" : "✗"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewTeamReports && (
          <TabsContent value="team-reports" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Team Daily Reports</h2>
                <p className="text-muted-foreground">View reports from all team members</p>
              </div>
              <Button onClick={exportTeamReports} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Reports
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Team Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTeamReports ? (
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
                          <TableHead>Follow Ups</TableHead>
                          <TableHead>Site Visits</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamReports.map((report) => {
                          const data = report.data || {};
                          const reportDate = new Date(report.generated_at);
                          
                          return (
                            <TableRow key={report.id}>
                              <TableCell>
                                {reportDate.toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-medium">
                                {report.profiles?.full_name || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{report.profiles?.role || 'Unknown'}</Badge>
                              </TableCell>
                              <TableCell>{data.leads_registered || 0}</TableCell>
                              <TableCell>{data.leads_called || 0}</TableCell>
                              <TableCell>{data.follow_ups || 0}</TableCell>
                              <TableCell>
                                {(data.primary_sites_visited || 0) + (data.client_visit || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">
                                  {/* Calculate score based on metrics */}
                                  {Math.min(100, 
                                    (data.leads_registered || 0) * 10 + 
                                    (data.leads_called || 0) * 5 + 
                                    (data.follow_ups || 0)
                                  )}
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
                    No team reports found for the last 7 days.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canViewTeamReports && (
          <TabsContent value="team-planners" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Team Daily Planners</h2>
                <p className="text-muted-foreground">View tasks and planners from all team members</p>
              </div>
              <Button onClick={exportTeamPlanners} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Planners
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Team Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTeamPlanners ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : teamPlanners.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamPlanners.map((task) => {
                          const dueDate = task.due_date ? new Date(task.due_date) : null;
                          const isOverdue = dueDate && dueDate < new Date() && !task.is_completed;
                          
                          return (
                            <TableRow key={task.id}>
                              <TableCell>
                                {dueDate ? format(dueDate, 'MMM dd, yyyy') : 'No date'}
                              </TableCell>
                              <TableCell className="font-medium max-w-xs">
                                <div>
                                  <div>{task.title}</div>
                                  {task.description && (
                                    <div className="text-sm text-muted-foreground truncate">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {task.assigned_profile?.full_name || 'Unassigned'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  task.priority === 'high' ? 'destructive' : 
                                  task.priority === 'medium' ? 'secondary' : 
                                  'outline'
                                }>
                                  {task.priority || 'medium'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {task.is_completed ? (
                                  <Badge variant="default">Completed</Badge>
                                ) : isOverdue ? (
                                  <Badge variant="destructive">Overdue</Badge>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {task.creator_profile?.full_name || 'Unknown'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No upcoming team tasks found.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;