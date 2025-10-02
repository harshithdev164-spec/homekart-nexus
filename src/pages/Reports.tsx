import React, { useState, useEffect } from 'react';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { IntegratedDailyReport } from '@/components/reports/IntegratedDailyReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, BarChart3, Users, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Reports: React.FC = () => {
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
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_generated_by_fkey(full_name, role)
        `)
        .eq('report_type', 'team_performance')
        .order('generated_at', { ascending: false })
        .limit(50);

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
      ['Date', 'Employee', 'Role', 'Leads Registered', 'Leads Called', 'Follow Ups', 'Inventories Found', 'Site Visits', 'Calls to Agents', 'Calls to Developers', 'Digital Marketing Activities'].join(','),
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
          data.calls_to_developers || 0,
          (data.whatsapp_postings || 0) + (data.facebook_postings || 0) + (data.instagram_posting || 0)
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

  return (
    <div className="p-6">
      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className={`grid w-full ${canViewTeamReports ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Daily Reports
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics & Reports
          </TabsTrigger>
          {canViewTeamReports && (
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Reports
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="daily" className="space-y-0">
          <IntegratedDailyReport />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-0">
          <ReportGenerator />
        </TabsContent>

        {canViewTeamReports && (
          <TabsContent value="team" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Team Daily Reports</h2>
                <p className="text-muted-foreground">View and manage daily reports from all team members</p>
              </div>
              <Button onClick={exportTeamReports} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Team Reports
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Daily Reports Overview
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
                          <TableHead>Leads Registered</TableHead>
                          <TableHead>Leads Called</TableHead>
                          <TableHead>Follow Ups</TableHead>
                          <TableHead>Inventories</TableHead>
                          <TableHead>Site Visits</TableHead>
                          <TableHead>Agent Calls</TableHead>
                          <TableHead>Developer Calls</TableHead>
                          <TableHead>Digital Marketing</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamReports.map((report) => {
                          const data = report.data || {};
                          const reportDate = new Date(report.generated_at);
                          const isToday = new Date().toDateString() === reportDate.toDateString();
                          
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
                              <TableCell>{data.leads_registered || 0}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {data.leads_called || 0}
                                  {data.leads_called_status && <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {data.follow_ups || 0}
                                  {data.follow_ups_status && <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {data.inventories_found || 0}
                                  {data.inventories_found_status && <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>{(data.primary_sites_visited || 0) + (data.client_visit || 0)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {data.calls_to_agents || 0}
                                  {data.calls_to_agents_status && <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {data.calls_to_developers || 0}
                                  {data.calls_to_developers_status && <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(data.whatsapp_postings || 0) + (data.facebook_postings || 0) + (data.instagram_posting || 0)}
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
                    No team reports found. Team members need to submit their daily reports first.
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

export default Reports;