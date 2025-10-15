import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Calendar, TrendingUp, Users, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ReportData {
  id: string;
  title: string;
  report_type: string;
  generated_at: string;
  data: any;
  is_public: boolean;
  generated_by_name?: string;
}

interface DashboardStats {
  totalLeads: number;
  totalProperties: number;
  totalActivities: number;
  leadsByStatus: Array<{ name: string; value: number; color: string }>;
  propertiesByType: Array<{ name: string; value: number }>;
  monthlyLeads: Array<{ month: string; leads: number }>;
}

export const ReportGenerator: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reportType, setReportType] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchReports();
    fetchDashboardStats();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('generated_at', { ascending: false });

    if (data) {
      // Fetch user names separately to avoid join issues
      const reportsWithNames = await Promise.all(
        data.map(async (report) => {
          const { data: user } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', report.generated_by)
            .single();

          return {
            ...report,
            generated_by_name: user?.full_name || 'Unknown'
          };
        })
      );
      setReports(reportsWithNames);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch leads stats
      const { data: leadsData } = await supabase
        .from('leads')
        .select('status, created_at');

      const { data: propertiesData } = await supabase
        .from('properties')
        .select('property_type, created_at');

      const { data: activitiesData } = await supabase
        .from('activities')
        .select('created_at');

      if (leadsData && propertiesData && activitiesData) {
        // Process leads by status
        const leadsByStatus = leadsData.reduce((acc: any, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {});

        const statusColors: { [key: string]: string } = {
          new: '#3b82f6',
          contacted: '#f59e0b',
          qualified: '#10b981',
          converted: '#8b5cf6',
          lost: '#ef4444'
        };

        const leadsByStatusArray = Object.entries(leadsByStatus).map(([name, value]) => ({
          name,
          value: value as number,
          color: statusColors[name] || '#6b7280'
        }));

        // Process properties by type
        const propertiesByType = propertiesData.reduce((acc: any, property) => {
          acc[property.property_type] = (acc[property.property_type] || 0) + 1;
          return acc;
        }, {});

        const propertiesByTypeArray = Object.entries(propertiesByType).map(([name, value]) => ({
          name,
          value: value as number
        }));

        // Monthly leads for the last 6 months
        const monthlyLeads = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          
          const leadsCount = leadsData.filter(lead => 
            lead.created_at.startsWith(monthKey)
          ).length;

          monthlyLeads.push({ month: monthName, leads: leadsCount });
        }

        setStats({
          totalLeads: leadsData.length,
          totalProperties: propertiesData.length,
          totalActivities: activitiesData.length,
          leadsByStatus: leadsByStatusArray,
          propertiesByType: propertiesByTypeArray,
          monthlyLeads
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateReport = async () => {
    if (!reportType || !reportTitle || !currentUser) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      let reportData: any = {};
      const filters = { dateFrom, dateTo, reportType };

      // Fetch data based on report type
      switch (reportType) {
        case 'leads':
          const { data: leadsData } = await supabase
            .from('leads')
            .select(`
              *,
              assigned_to_profile:profiles!leads_assigned_to_fkey(full_name),
              created_by_profile:profiles!leads_created_by_fkey(full_name)
            `)
            .gte('created_at', dateFrom || '2020-01-01')
            .lte('created_at', dateTo || new Date().toISOString());
          
          // Format leads data for export
          const formattedLeads = leadsData?.map(lead => ({
            Name: lead.name,
            Phone: lead.phone,
            Email: lead.email,
            Status: lead.status,
            Source: lead.source,
            'Assigned To': lead.assigned_to_profile?.full_name || 'Unassigned',
            'Created By': lead.created_by_profile?.full_name || 'Unknown',
            'Budget Min': lead.budget_min,
            'Budget Max': lead.budget_max,
            'Property Type': lead.property_type,
            'Preferred Location': lead.preferred_location,
            'Created At': new Date(lead.created_at).toLocaleString(),
            'Last Contacted': lead.last_contacted ? new Date(lead.last_contacted).toLocaleString() : 'Never',
            Notes: lead.notes
          }));
          
          reportData = { leads: formattedLeads, summary: { total: leadsData?.length || 0 } };
          break;

        case 'properties':
          const { data: propertiesData } = await supabase
            .from('properties')
            .select(`
              *,
              created_by_profile:profiles!properties_created_by_fkey(full_name, phone),
              updated_by_profile:profiles!properties_updated_by_fkey(full_name)
            `)
            .gte('created_at', dateFrom || '2020-01-01')
            .lte('created_at', dateTo || new Date().toISOString());
          
          // Format properties data for export
          const formattedProperties = propertiesData?.map(property => ({
            Title: property.title,
            'Property Type': property.property_type,
            Status: property.status,
            Price: property.price,
            Location: property.location,
            City: property.city,
            State: property.state,
            Area: property.area,
            Bedrooms: property.bedrooms,
            Bathrooms: property.bathrooms,
            'Posted By': property.created_by_profile?.full_name || 'Unknown',
            'Contact': property.created_by_profile?.phone || 'N/A',
            'Source Type': property.source_type,
            Category: property.category,
            'Created At': new Date(property.created_at).toLocaleString(),
            'Updated At': new Date(property.updated_at).toLocaleString(),
            'Updated By': property.updated_by_profile?.full_name || 'N/A',
            Description: property.description
          }));
          
          reportData = { properties: formattedProperties, summary: { total: propertiesData?.length || 0 } };
          break;

        case 'activities':
          const { data: activitiesData } = await supabase
            .from('activities')
            .select('*')
            .gte('created_at', dateFrom || '2020-01-01')
            .lte('created_at', dateTo || new Date().toISOString());
          reportData = { activities: activitiesData, summary: { total: activitiesData?.length || 0 } };
          break;

        case 'team_performance':
          // Fetch team performance data
          const { data: teamData } = await supabase
            .from('profiles')
            .select(`
              id, full_name,
              leads_created:leads!leads_created_by_fkey(count),
              activities_created:activities!activities_created_by_fkey(count)
            `);
          reportData = { teamPerformance: teamData };
          break;

        default:
          reportData = stats;
      }

      // Save report
      const { error } = await supabase
        .from('reports')
        .insert({
          title: reportTitle,
          report_type: reportType,
          filters,
          data: reportData,
          generated_by: currentUser.id,
          is_public: false
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report generated successfully'
      });

      // Reset form
      setReportTitle('');
      setReportType('');
      setDateFrom('');
      setDateTo('');
      
      // Refresh reports list
      fetchReports();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = (report: ReportData) => {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Convert report data to worksheets
      if (report.data.leads) {
        const ws = XLSX.utils.json_to_sheet(report.data.leads);
        XLSX.utils.book_append_sheet(workbook, ws, 'Leads');
      }

      if (report.data.properties) {
        const ws = XLSX.utils.json_to_sheet(report.data.properties);
        XLSX.utils.book_append_sheet(workbook, ws, 'Properties');
      }

      if (report.data.activities) {
        const ws = XLSX.utils.json_to_sheet(report.data.activities);
        XLSX.utils.book_append_sheet(workbook, ws, 'Activities');
      }

      if (report.data.teamPerformance) {
        const ws = XLSX.utils.json_to_sheet(report.data.teamPerformance);
        XLSX.utils.book_append_sheet(workbook, ws, 'Team Performance');
      }

      // If no specific data sheets, create a summary sheet
      if (!report.data.leads && !report.data.properties && !report.data.activities && !report.data.teamPerformance) {
        const summaryData = [
          { Metric: 'Report Title', Value: report.title },
          { Metric: 'Report Type', Value: report.report_type },
          { Metric: 'Generated Date', Value: report.generated_at },
          { Metric: 'Total Leads', Value: report.data.totalLeads || 0 },
          { Metric: 'Total Properties', Value: report.data.totalProperties || 0 },
          { Metric: 'Total Activities', Value: report.data.totalActivities || 0 }
        ];
        const ws = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, ws, 'Summary');
      }

      // Write and download the file
      const fileName = `${report.title.replace(/\s+/g, '_')}_${report.generated_at.split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: 'Success',
        description: 'Report exported as Excel file successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report as Excel',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <p className="text-muted-foreground">Generate and view business reports</p>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{stats.totalLeads}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                  <p className="text-2xl font-bold">{stats.totalProperties}</p>
                </div>
                <Home className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activities</p>
                  <p className="text-2xl font-bold">{stats.totalActivities}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">
                    {stats.leadsByStatus.length > 0 
                      ? ((stats.leadsByStatus.find(s => s.name === 'converted')?.value || 0) / stats.totalLeads * 100).toFixed(1)
                      : 0
                    }%
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Leads Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.monthlyLeads}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leads by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.leadsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats.leadsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Title</label>
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads Report</SelectItem>
                  <SelectItem value="properties">Properties Report</SelectItem>
                  <SelectItem value="activities">Activities Report</SelectItem>
                  <SelectItem value="team_performance">Team Performance</SelectItem>
                  <SelectItem value="sales">Sales Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={generateReport} disabled={isLoading}>
            <FileText className="h-4 w-4 mr-2" />
            {isLoading ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Generated By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.report_type}</Badge>
                  </TableCell>
                  <TableCell>{report.generated_by_name}</TableCell>
                  <TableCell>
                    {new Date(report.generated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={report.is_public ? 'default' : 'secondary'}>
                      {report.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportReport(report)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};