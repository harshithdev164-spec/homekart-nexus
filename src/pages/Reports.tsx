import React, { useState, useEffect } from 'react';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { IntegratedDailyReport } from '@/components/reports/IntegratedDailyReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, BarChart3, Users, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const Reports: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [teamReports, setTeamReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Check if user is admin or HR (manager)
  const canViewTeamReports = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    if (canViewTeamReports) {
      fetchTeamReports();
    }
  }, [canViewTeamReports, startDate, endDate]);

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
        .gte('generated_at', format(startDate, 'yyyy-MM-dd'))
        .lte('generated_at', format(endDate, 'yyyy-MM-dd') + 'T23:59:59')
        .order('generated_at', { ascending: false });

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
    if (teamReports.length === 0) {
      toast({
        title: 'No Data',
        description: 'No reports available to export',
        variant: 'destructive'
      });
      return;
    }

    // Prepare data for Excel
    const excelData = teamReports.map(report => {
      const data = report.data || {};
      const reportDate = new Date(report.generated_at);
      
      return {
        'Date': format(reportDate, 'dd-MMM-yyyy'),
        'Employee Name': report.profiles?.full_name || 'Unknown',
        'Role': report.profiles?.role || 'Unknown',
        
        // Lead Management
        'Leads Registered': data.leads_registered || 0,
        'Leads Called': data.leads_called || 0,
        'Follow Ups': data.follow_ups || 0,
        'Follow Up Description': data.follow_ups_description || '',
        
        // Inventory & Visits
        'Inventories Found': data.inventories_found || 0,
        'Primary Sites Visited': data.primary_sites_visited || 0,
        'Client Visits': data.client_visit || 0,
        'Total Site Visits': (data.primary_sites_visited || 0) + (data.client_visit || 0),
        
        // Communications
        'Calls to Agents': data.calls_to_agents || 0,
        'Agent Names': data.agent_names || '',
        'Calls to Developers': data.calls_to_developers || 0,
        'Developer Call Details': data.calls_to_developers_description || '',
        
        // Digital Marketing
        'WhatsApp Postings': data.whatsapp_postings || 0,
        'Agents Added': data.agents_added || 0,
        'Agents Contacted': data.agents_contacted || 0,
        'Facebook Postings': data.facebook_postings || 0,
        'Instagram Postings': data.instagram_posting || 0,
        '99Acres Postings': data.acres_99_postings || 0,
        'Google Reviews': data.google_reviews || 0,
        'Surrendered Leads': data.surrendered_leads || 0,
        'MagicBricks Postings': data.mb_postings || 0,
        'Website Postings': data.website_postings || 0,
        'Total Digital Marketing': (data.whatsapp_postings || 0) + (data.facebook_postings || 0) + (data.instagram_posting || 0) + (data.acres_99_postings || 0),
        
        // Email Communications
        'Mails Sent': data.mails_sent || 0,
        'Cross Pitching Mails': data.cross_pitching_mails || 0,
        
        // Notes
        'Challenges Faced': data.challenges_faced || '',
        'Achievements': data.achievements || '',
        'Next Day Plan': data.next_day_plan || '',
      };
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Employee Name
      { wch: 12 }, // Role
      { wch: 15 }, // Leads Registered
      { wch: 15 }, // Leads Called
      { wch: 12 }, // Follow Ups
      { wch: 30 }, // Follow Up Description
      { wch: 15 }, // Inventories Found
      { wch: 18 }, // Primary Sites Visited
      { wch: 15 }, // Client Visits
      { wch: 15 }, // Total Site Visits
      { wch: 15 }, // Calls to Agents
      { wch: 30 }, // Agent Names
      { wch: 18 }, // Calls to Developers
      { wch: 30 }, // Developer Call Details
      { wch: 18 }, // WhatsApp Postings
      { wch: 15 }, // Agents Added
      { wch: 18 }, // Agents Contacted
      { wch: 18 }, // Facebook Postings
      { wch: 18 }, // Instagram Postings
      { wch: 15 }, // 99Acres Postings
      { wch: 15 }, // Google Reviews
      { wch: 18 }, // Surrendered Leads
      { wch: 20 }, // MagicBricks Postings
      { wch: 18 }, // Website Postings
      { wch: 20 }, // Total Digital Marketing
      { wch: 12 }, // Mails Sent
      { wch: 20 }, // Cross Pitching Mails
      { wch: 40 }, // Challenges Faced
      { wch: 40 }, // Achievements
      { wch: 40 }, // Next Day Plan
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team Daily Reports');

    // Generate filename
    const filename = `Team_Reports_${format(startDate, 'dd-MMM-yyyy')}_to_${format(endDate, 'dd-MMM-yyyy')}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Success',
      description: 'Team reports exported successfully'
    });
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Team Daily Reports</h2>
                  <p className="text-muted-foreground">View and manage daily reports from all team members</p>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">From Date:</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[200px] justify-start text-left">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(startDate, 'dd MMM yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && setStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">To Date:</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[200px] justify-start text-left">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(endDate, 'dd MMM yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button onClick={exportTeamReports} variant="default" className="ml-auto">
                      <Download className="mr-2 h-4 w-4" />
                      Export to Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
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