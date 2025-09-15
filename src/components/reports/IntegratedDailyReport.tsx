import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface DailyReportData {
  id: string;
  title: string;
  report_type: string;
  data: any;
  generated_by: string;
  generated_at: string;
  reporter?: {
    full_name: string;
  };
}

export const IntegratedDailyReport: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [editingReport, setEditingReport] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    leads_contacted: 0,
    meetings_scheduled: 0,
    site_visits: 0,
    follow_ups_pending: 0,
    deals_closed: 0,
    revenue_generated: 0,
    challenges_faced: '',
    achievements: '',
    next_day_plan: '',
    call_sheet_attached: false,
  });

  useEffect(() => {
    if (profile) {
      fetchReports();
      setupRealtimeSubscription();
    }
  }, [profile, selectedDate]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('daily_reports_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'daily_reports' },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchReports = async () => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('report_type', 'daily_report')
      .gte('generated_at', format(startOfMonth, 'yyyy-MM-dd'))
      .lte('generated_at', format(endOfMonth, 'yyyy-MM-dd'))
      .order('generated_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch daily reports',
        variant: 'destructive'
      });
    } else {
      // Fetch reporter names separately
      const reportsWithReporter = await Promise.all((data || []).map(async (report) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', report.generated_by)
          .single();
        
        return {
          ...report,
          reporter: profile || { full_name: 'Unknown' }
        };
      }));
      setReports(reportsWithReporter);
    }
    setLoading(false);
  };

  const saveReport = async (reportId?: string) => {
    if (!profile) return;

    const reportData = {
      title: `Daily Report - ${format(selectedDate, 'dd MMM yyyy')}`,
      report_type: 'daily_report',
      data: formData,
      generated_by: profile.id,
      filters: { report_date: format(selectedDate, 'yyyy-MM-dd') }
    };

    let error;
    if (reportId) {
      ({ error } = await supabase
        .from('reports')
        .update(reportData)
        .eq('id', reportId));
    } else {
      ({ error } = await supabase
        .from('reports')
        .insert(reportData));
    }

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save report',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Daily report saved successfully'
      });
      setEditingReport(null);
      resetForm();
    }
  };

  const startEditing = (report: DailyReportData) => {
    const reportData = report.data || {};
    setFormData({
      leads_contacted: reportData.leads_contacted || 0,
      meetings_scheduled: reportData.meetings_scheduled || 0,
      site_visits: reportData.site_visits || 0,
      follow_ups_pending: reportData.follow_ups_pending || 0,
      deals_closed: reportData.deals_closed || 0,
      revenue_generated: reportData.revenue_generated || 0,
      challenges_faced: reportData.challenges_faced || '',
      achievements: reportData.achievements || '',
      next_day_plan: reportData.next_day_plan || '',
      call_sheet_attached: reportData.call_sheet_attached || false,
    });
    setEditingReport(report.id);
  };

  const resetForm = () => {
    setFormData({
      leads_contacted: 0,
      meetings_scheduled: 0,
      site_visits: 0,
      follow_ups_pending: 0,
      deals_closed: 0,
      revenue_generated: 0,
      challenges_faced: '',
      achievements: '',
      next_day_plan: '',
      call_sheet_attached: false,
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Reporter', 'Leads Contacted', 'Meetings Scheduled', 'Site Visits', 'Follow-ups Pending', 'Deals Closed', 'Revenue Generated', 'Challenges', 'Achievements', 'Next Day Plan'].join(','),
      ...reports.map(report => {
        const data = report.data || {};
        return [
          report.generated_at.split('T')[0],
          report.reporter?.full_name || 'Unknown',
          data.leads_contacted || 0,
          data.meetings_scheduled || 0,
          data.site_visits || 0,
          data.follow_ups_pending || 0,
          data.deals_closed || 0,
          data.revenue_generated || 0,
          `"${(data.challenges_faced || '').replace(/"/g, '""')}"`,
          `"${(data.achievements || '').replace(/"/g, '""')}"`,
          `"${(data.next_day_plan || '').replace(/"/g, '""')}"`,
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_reports_${format(selectedDate, 'yyyy_MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const todaysReport = reports.find(report => 
    report.generated_at.split('T')[0] === format(selectedDate, 'yyyy-MM-dd')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrated Daily Report</h2>
          <p className="text-muted-foreground">Daily Status, Workload, and Performance Tracking</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Today's Report Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daily Report - {format(selectedDate, 'dd MMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Leads Contacted</label>
              <Input
                type="number"
                value={formData.leads_contacted}
                onChange={(e) => setFormData(prev => ({ ...prev, leads_contacted: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meetings Scheduled</label>
              <Input
                type="number"
                value={formData.meetings_scheduled}
                onChange={(e) => setFormData(prev => ({ ...prev, meetings_scheduled: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Site Visits</label>
              <Input
                type="number"
                value={formData.site_visits}
                onChange={(e) => setFormData(prev => ({ ...prev, site_visits: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Follow-ups Pending</label>
              <Input
                type="number"
                value={formData.follow_ups_pending}
                onChange={(e) => setFormData(prev => ({ ...prev, follow_ups_pending: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deals Closed</label>
              <Input
                type="number"
                value={formData.deals_closed}
                onChange={(e) => setFormData(prev => ({ ...prev, deals_closed: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Revenue Generated (₹)</label>
              <Input
                type="number"
                value={formData.revenue_generated}
                onChange={(e) => setFormData(prev => ({ ...prev, revenue_generated: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Challenges Faced</label>
              <Textarea
                value={formData.challenges_faced}
                onChange={(e) => setFormData(prev => ({ ...prev, challenges_faced: e.target.value }))}
                placeholder="Describe any challenges..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Achievements</label>
              <Textarea
                value={formData.achievements}
                onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
                placeholder="List your achievements..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Next Day Plan</label>
              <Textarea
                value={formData.next_day_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, next_day_plan: e.target.value }))}
                placeholder="Plan for tomorrow..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => saveReport(editingReport || undefined)}>
              <Save className="mr-2 h-4 w-4" />
              {editingReport ? 'Update Report' : 'Save Report'}
            </Button>
            {editingReport && (
              <Button variant="outline" onClick={() => {
                setEditingReport(null);
                resetForm();
              }}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reports History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Meetings</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Deals</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{format(new Date(report.generated_at), 'dd MMM')}</TableCell>
                  <TableCell>{report.reporter?.full_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.data?.leads_contacted || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.data?.meetings_scheduled || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.data?.site_visits || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{report.data?.deals_closed || 0}</Badge>
                  </TableCell>
                  <TableCell>₹{(report.data?.revenue_generated || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(report)}
                    >
                      Edit
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