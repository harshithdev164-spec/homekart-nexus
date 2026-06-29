import React, { useState, useEffect } from 'react';
import { IntegratedDailyReport } from '@/components/reports/IntegratedDailyReport';
import { SalesPerformanceReport } from '@/components/reports/SalesPerformanceReport';
import { LeadManagementReport } from '@/components/reports/LeadManagementReport';
import { PropertyReport } from '@/components/reports/PropertyReport';
import { AgentPerformanceReport } from '@/components/reports/AgentPerformanceReport';
import { MarketingReport } from '@/components/reports/MarketingReport';
import { ActivityReport } from '@/components/reports/ActivityReport';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { ReportScheduler } from '@/components/reports/ReportScheduler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, TrendingUp, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

type TimeRange = 'week' | 'month' | 'custom';

const Reports: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teamReports, setTeamReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [employees, setEmployees] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  const canViewTeamReports = profile?.role === 'admin' || profile?.role === 'manager';
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  useEffect(() => {
    if (canViewTeamReports) {
      fetchEmployees();
      fetchTeamReports();

      const channel = supabase
        .channel('reports_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', filter: `report_type=eq.team_performance` }, () => {
          fetchTeamReports();
        })
        .subscribe();

      return () => {
        try { channel.unsubscribe(); } catch (e) { /* ignore */ }
      };
    }
  }, [canViewTeamReports, startDate, endDate, selectedEmployee]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('is_active', true)
      .order('full_name');
    
    if (data) setEmployees(data);
  };

  const fetchTeamReports = async () => {
    setLoading(true);
    try {
      const startISO = new Date(startDate);
      startISO.setHours(0, 0, 0, 0);
      const endISO = new Date(endDate);
      endISO.setHours(23, 59, 59, 999);

      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_generated_by_fkey(full_name, role, department)
        `)
        .eq('report_type', 'team_performance')
        .gte('generated_at', startISO.toISOString())
        .lte('generated_at', endISO.toISOString())
        .order('generated_at', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('generated_by', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching team reports:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch team reports',
          variant: 'destructive'
        });
      } else {
        setTeamReports(data || []);
        processAnalytics(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: safely coerce unknown values to numbers
  const toNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const processAnalytics = (reports: any[]) => {
    // Performance metrics by employee
    const employeeMetrics = new Map();
    reports.forEach(report => {
      const data = report.data as any;
      const name = report.profiles?.full_name || 'Unknown';
      const existing = employeeMetrics.get(name) || { 
        name, 
        leads: 0,
        calls: 0,
        visits: 0,
        followUps: 0,
        inventories: 0,
      };
      existing.leads += toNumber(data?.leads_registered);
      existing.calls += toNumber(data?.calls_to_agents);
      existing.visits += toNumber(data?.primary_sites_visited) + toNumber(data?.client_visit);
      existing.followUps += toNumber(data?.follow_ups);
      existing.inventories += toNumber(data?.inventories_found);
      employeeMetrics.set(name, existing);
    });
    setPerformanceMetrics(Array.from(employeeMetrics.values()));

    // Department breakdown
    const deptMetrics = new Map();
    reports.forEach(report => {
      const dept = report.profiles?.department || 'Unassigned';
      const data = report.data as any;
      const existing = deptMetrics.get(dept) || { name: dept, value: 0 };
      existing.value += toNumber(data?.leads_registered) + toNumber(data?.calls_to_agents);
      deptMetrics.set(dept, existing);
    });
    setDepartmentData(Array.from(deptMetrics.values()));

    // Trend over time (last 7 reports) — sort ascending and take last 7
    const sorted = [...reports].sort((a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime());
    const lastSeven = sorted.slice(-7);
    const trends = lastSeven.map(report => {
      const data = report.data as any;
      return {
        date: format(new Date(report.generated_at), 'MMM dd'),
        leads: toNumber(data?.leads_registered),
        calls: toNumber(data?.calls_to_agents),
        visits: toNumber(data?.primary_sites_visited) + toNumber(data?.client_visit),
      };
    });
    setTrendData(trends);
  };

  const exportTeamReports = () => {
    if (teamReports.length === 0) {
      toast({
        title: 'No Data',
        description: 'No reports available to export',
        variant: 'destructive'
      });
      return;
    }

    const excelData = teamReports.map(report => {
      const data = report.data as any;
      const reportDate = new Date(report.generated_at);
      // Lead info fields (if present in report)
      const leadName = data?.lead_name || '';
      const leadProject = data?.project_name || '';
      const leadBudgetMin = data?.budget_min ? `₹${data.budget_min.toLocaleString()}` : '';
      const leadBudgetMax = data?.budget_max ? `₹${data.budget_max.toLocaleString()}` : '';
      const leadBudget = leadBudgetMin || leadBudgetMax ? `${leadBudgetMin}${leadBudgetMax ? ' - ' + leadBudgetMax : ''}` : '';
      const leadStatus = data?.lead_status || '';
      const leadAssignedDate = data?.lead_assigned_at ? format(new Date(data.lead_assigned_at), 'dd-MMM-yyyy') : '';

      return {
        'Date': format(reportDate, 'dd-MMM-yyyy'),
        'Employee Name': report.profiles?.full_name || 'Unknown',
        'Role': report.profiles?.role || 'Unknown',
        'Leads Registered': toNumber(data?.leads_registered),
        'Leads Called': toNumber(data?.leads_called),
        'Follow Ups': toNumber(data?.follow_ups),
        'Inventories Found': toNumber(data?.inventories_found),
        'Primary Sites Visited': toNumber(data?.primary_sites_visited),
        'Client Visits': toNumber(data?.client_visit),
        'Total Site Visits': toNumber(data?.primary_sites_visited) + toNumber(data?.client_visit),
        'Calls to Agents': toNumber(data?.calls_to_agents),
        'Calls to Developers': toNumber(data?.calls_to_developers),
        'Emails to Developers': toNumber(data?.emails_to_developers),
        'Digital Marketing Calls': toNumber(data?.digital_marketing_calls),
        'Lead Name': leadName,
        'Project': leadProject,
        'Budget': leadBudget,
        'Lead Status': leadStatus,
        'Assigned Date': leadAssignedDate,
        'Notes': data?.notes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const columnWidths = [
      { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, 
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, 
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, 
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 50 }
    ];
    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team Reports');
    XLSX.writeFile(wb, `team_reports_${format(startDate, 'yyyy_MM_dd')}_to_${format(endDate, 'yyyy_MM_dd')}.xlsx`);

    toast({
      title: 'Success',
      description: 'Reports exported successfully',
    });
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Comprehensive performance reports and insights</p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="flex md:grid w-full md:grid-cols-9 overflow-x-auto no-scrollbar justify-start [&>button]:flex-shrink-0">
          <TabsTrigger value="daily">Daily Reports</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Daily Reports */}
        <TabsContent value="daily" className="space-y-6">
          <IntegratedDailyReport />
        </TabsContent>

        {/* Sales Performance Report */}
        <TabsContent value="sales" className="space-y-6">
          <SalesPerformanceReport />
        </TabsContent>

        {/* Lead Management Report */}
        <TabsContent value="leads" className="space-y-6">
          <LeadManagementReport />
        </TabsContent>

        {/* Property Report */}
        <TabsContent value="properties" className="space-y-6">
          <PropertyReport />
        </TabsContent>

        {/* Agent Performance Report */}
        <TabsContent value="agents" className="space-y-6">
          <AgentPerformanceReport />
        </TabsContent>

        {/* Marketing Report */}
        <TabsContent value="marketing" className="space-y-6">
          <MarketingReport />
        </TabsContent>

        {/* Activity Report */}
        <TabsContent value="activity" className="space-y-6">
          <ActivityReport />
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-6">
          <FinancialReport />
        </TabsContent>

        {/* Legacy Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="flex sm:grid w-full sm:grid-cols-4 overflow-x-auto no-scrollbar justify-start [&>button]:flex-shrink-0">
              <TabsTrigger value="team">Team Analytics</TabsTrigger>
              <TabsTrigger value="submit">Submit Report</TabsTrigger>
              <TabsTrigger value="data">Data Table</TabsTrigger>
              <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            </TabsList>

            {/* Team Analytics Tab */}
            <TabsContent value="team" className="space-y-6">
          {/* Filters */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      From: {format(startDate, 'PP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      To: {format(endDate, 'PP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {canViewTeamReports && (
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button onClick={exportTeamReports} variant="default" className="ml-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Employee Performance */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Employee Performance
                    </CardTitle>
                    <CardDescription>Comprehensive metrics by employee</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={performanceMetrics.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Bar dataKey="leads" fill="hsl(var(--chart-1))" name="Leads" />
                        <Bar dataKey="calls" fill="hsl(var(--chart-2))" name="Calls" />
                        <Bar dataKey="visits" fill="hsl(var(--chart-3))" name="Visits" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Trend Analysis */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                      Performance Trend
                    </CardTitle>
                    <CardDescription>Activity over selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="leads" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Leads" />
                        <Line type="monotone" dataKey="calls" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Calls" />
                        <Line type="monotone" dataKey="visits" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Visits" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Distribution */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-accent" />
                      Department Activity
                    </CardTitle>
                    <CardDescription>Activity distribution by department</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={departmentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {departmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Performance Radar */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>Performance Radar</CardTitle>
                    <CardDescription>Multi-dimensional analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={performanceMetrics.slice(0, 1).map(emp => [
                        { subject: 'Leads', value: emp.leads, fullMark: Math.max(0, ...performanceMetrics.map(e => e.leads)) },
                        { subject: 'Calls', value: emp.calls, fullMark: Math.max(0, ...performanceMetrics.map(e => e.calls)) },
                        { subject: 'Visits', value: emp.visits, fullMark: Math.max(0, ...performanceMetrics.map(e => e.visits)) },
                        { subject: 'Follow-ups', value: emp.followUps, fullMark: Math.max(0, ...performanceMetrics.map(e => e.followUps)) },
                        { subject: 'Inventory', value: emp.inventories, fullMark: Math.max(0, ...performanceMetrics.map(e => e.inventories)) },
                      ])[0] || []}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                        <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                        <Radar name="Performance" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

            {/* Submit Report Tab */}
            <TabsContent value="submit" className="space-y-0">
              <IntegratedDailyReport />
            </TabsContent>

            {/* Data Table Tab */}
            <TabsContent value="data" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Team Reports Data</CardTitle>
              <CardDescription>Detailed view of all reports</CardDescription>
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
                        <TableHead>Visits</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                        <TableBody>
                      {teamReports.map((report) => {
                        const data = report.data as any;
                        const score = ((toNumber(data?.leads_registered) * 10) + 
                                     (toNumber(data?.calls_to_agents) * 5) + 
                                     (toNumber(data?.follow_ups)));
                        return (
                          <TableRow key={report.id}>
                            <TableCell>{format(new Date(report.generated_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium">{report.profiles?.full_name || 'Unknown'}</TableCell>
                            <TableCell><Badge variant="outline">{report.profiles?.role || 'Unknown'}</Badge></TableCell>
                            <TableCell>{toNumber(data?.leads_registered)}</TableCell>
                            <TableCell>{toNumber(data?.calls_to_agents)}</TableCell>
                            <TableCell>{toNumber(data?.primary_sites_visited) + toNumber(data?.client_visit)}</TableCell>
                            <TableCell><Badge>{Math.min(100, score)}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No reports found for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* Scheduler Tab */}
            <TabsContent value="scheduler" className="space-y-6">
              <ReportScheduler />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
