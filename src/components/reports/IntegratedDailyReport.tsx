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
  report_date: string;
  leads_contacted: number;
  meetings_scheduled: number;
  site_visits: number;
  follow_ups_pending: number;
  deals_closed: number;
  revenue_generated: number;
  challenges_faced: string;
  achievements: string;
  next_day_plan: string;
  call_sheet_attached: boolean;
  submitted_by: string;
  created_at: string;
  updated_at: string;
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
      .from('daily_reports')
      .select(`
        *,
        reporter:submitted_by(full_name)
      `)
      .gte('report_date', format(startOfMonth, 'yyyy-MM-dd'))
      .lte('report_date', format(endOfMonth, 'yyyy-MM-dd'))
      .order('report_date', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch daily reports',
        variant: 'destructive'
      });
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const saveReport = async (reportId?: string) => {
    if (!profile) return;

    const reportData = {
      ...formData,
      report_date: format(selectedDate, 'yyyy-MM-dd'),
      submitted_by: profile.id,
    };

    let error;
    if (reportId) {
      ({ error } = await supabase
        .from('daily_reports')
        .update(reportData)
        .eq('id', reportId));
    } else {
      ({ error } = await supabase
        .from('daily_reports')
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
    setFormData({
      leads_contacted: report.leads_contacted,
      meetings_scheduled: report.meetings_scheduled,
      site_visits: report.site_visits,
      follow_ups_pending: report.follow_ups_pending,
      deals_closed: report.deals_closed,
      revenue_generated: report.revenue_generated,
      challenges_faced: report.challenges_faced,
      achievements: report.achievements,
      next_day_plan: report.next_day_plan,
      call_sheet_attached: report.call_sheet_attached,
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
      ...reports.map(report => [
        report.report_date,
        report.reporter?.full_name || 'Unknown',
        report.leads_contacted,
        report.meetings_scheduled,
        report.site_visits,
        report.follow_ups_pending,
        report.deals_closed,
        report.revenue_generated,
        `"${report.challenges_faced.replace(/"/g, '""')}"`,
        `"${report.achievements.replace(/"/g, '""')}"`,
        `"${report.next_day_plan.replace(/"/g, '""')}"`,
      ].join(','))
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
    report.report_date === format(selectedDate, 'yyyy-MM-dd')
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
                  <TableCell>{format(new Date(report.report_date), 'dd MMM')}</TableCell>
                  <TableCell>{report.reporter?.full_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.leads_contacted}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.meetings_scheduled}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.site_visits}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{report.deals_closed}</Badge>
                  </TableCell>
                  <TableCell>₹{report.revenue_generated.toLocaleString()}</TableCell>
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