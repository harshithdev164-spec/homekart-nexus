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
    // Core Lead Management
    leads_registered: 0,
    leads_called: 0,
    leads_called_status: false,
    follow_ups: 30,
    follow_ups_status: true,
    follow_ups_description: '',
    
    // Inventory & Site Visits
    inventories_found: 0,
    inventories_found_status: false,
    primary_sites_visited: 0,
    client_visit: 0,
    
    // Agent & Developer Calls
    calls_to_agents: 0,
    calls_to_agents_status: false,
    agent_names: 'Harsh, Shivani, Saumya, Rumana',
    calls_to_developers: 0,
    calls_to_developers_status: false,
    calls_to_developers_description: '',
    
    // Digital Marketing Activities
    whatsapp_postings: 0,
    agents_added: 0,
    agents_contacted: 0,
    facebook_postings: 0,
    facebook_postings_status: false,
    instagram_posting: 0,
    acres_99_postings: 0,
    acres_99_status: false,
    google_reviews: 0,
    google_reviews_status: false,
    surrendered_leads: 0,
    surrendered_leads_status: false,
    mb_postings: 0,
    website_postings: 0,
    
    // Communication
    mails_sent: 0,
    cross_pitching_mails: 0,
    
    // Legacy fields for backward compatibility
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
      console.error('Save error:', error);
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
      fetchReports();
    }
  };

  const startEditing = (report: DailyReportData) => {
    const reportData = report.data || {};
    setFormData({
      // Core Lead Management
      leads_registered: reportData.leads_registered || 0,
      leads_called: reportData.leads_called || 0,
      leads_called_status: reportData.leads_called_status || false,
      follow_ups: reportData.follow_ups || 30,
      follow_ups_status: reportData.follow_ups_status || true,
      follow_ups_description: reportData.follow_ups_description || '',
      
      // Inventory & Site Visits
      inventories_found: reportData.inventories_found || 0,
      inventories_found_status: reportData.inventories_found_status || false,
      primary_sites_visited: reportData.primary_sites_visited || 0,
      client_visit: reportData.client_visit || 0,
      
      // Agent & Developer Calls
      calls_to_agents: reportData.calls_to_agents || 0,
      calls_to_agents_status: reportData.calls_to_agents_status || false,
      agent_names: reportData.agent_names || 'Harsh, Shivani, Saumya, Rumana',
      calls_to_developers: reportData.calls_to_developers || 0,
      calls_to_developers_status: reportData.calls_to_developers_status || false,
      calls_to_developers_description: reportData.calls_to_developers_description || '',
      
      // Digital Marketing Activities
      whatsapp_postings: reportData.whatsapp_postings || 0,
      agents_added: reportData.agents_added || 0,
      agents_contacted: reportData.agents_contacted || 0,
      facebook_postings: reportData.facebook_postings || 0,
      facebook_postings_status: reportData.facebook_postings_status || false,
      instagram_posting: reportData.instagram_posting || 0,
      acres_99_postings: reportData.acres_99_postings || 0,
      acres_99_status: reportData.acres_99_status || false,
      google_reviews: reportData.google_reviews || 0,
      google_reviews_status: reportData.google_reviews_status || false,
      surrendered_leads: reportData.surrendered_leads || 0,
      surrendered_leads_status: reportData.surrendered_leads_status || false,
      mb_postings: reportData.mb_postings || 0,
      website_postings: reportData.website_postings || 0,
      
      // Communication
      mails_sent: reportData.mails_sent || 0,
      cross_pitching_mails: reportData.cross_pitching_mails || 0,
      
      // Legacy fields for backward compatibility
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
      // Core Lead Management
      leads_registered: 0,
      leads_called: 0,
      leads_called_status: false,
      follow_ups: 30,
      follow_ups_status: true,
      follow_ups_description: '',
      
      // Inventory & Site Visits
      inventories_found: 0,
      inventories_found_status: false,
      primary_sites_visited: 0,
      client_visit: 0,
      
      // Agent & Developer Calls
      calls_to_agents: 0,
      calls_to_agents_status: false,
      agent_names: 'Harsh, Shivani, Saumya, Rumana',
      calls_to_developers: 0,
      calls_to_developers_status: false,
      calls_to_developers_description: '',
      
      // Digital Marketing Activities
      whatsapp_postings: 0,
      agents_added: 0,
      agents_contacted: 0,
      facebook_postings: 0,
      facebook_postings_status: false,
      instagram_posting: 0,
      acres_99_postings: 0,
      acres_99_status: false,
      google_reviews: 0,
      google_reviews_status: false,
      surrendered_leads: 0,
      surrendered_leads_status: false,
      mb_postings: 0,
      website_postings: 0,
      
      // Communication
      mails_sent: 0,
      cross_pitching_mails: 0,
      
      // Legacy fields for backward compatibility
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
      ['Date', 'Reporter', 'Leads Registered', 'Leads Called', 'Follow Ups', 'Inventories Found', 'Primary Sites Visited', 'Client Visit', 'Calls to Agents', 'Calls to Developers', 'WhatsApp Postings', 'Facebook Postings', 'Instagram Postings', 'Mails Sent', 'Cross Pitching Mails'].join(','),
      ...reports.map(report => {
        const data = report.data || {};
        return [
          report.generated_at.split('T')[0],
          report.reporter?.full_name || 'Unknown',
          data.leads_registered || 0,
          data.leads_called || 0,
          data.follow_ups || 0,
          data.inventories_found || 0,
          data.primary_sites_visited || 0,
          data.client_visit || 0,
          data.calls_to_agents || 0,
          data.calls_to_developers || 0,
          data.whatsapp_postings || 0,
          data.facebook_postings || 0,
          data.instagram_posting || 0,
          data.mails_sent || 0,
          data.cross_pitching_mails || 0,
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
          {/* Lead Management Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-primary">1. Lead Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">1.1 Leads Registered (minimum)</label>
                <Input
                  type="number"
                  value={formData.leads_registered}
                  onChange={(e) => setFormData(prev => ({ ...prev, leads_registered: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">1.2 Leads Called</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.leads_called}
                    onChange={(e) => setFormData(prev => ({ ...prev, leads_called: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <select
                    value={formData.leads_called_status ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, leads_called_status: e.target.value === 'yes' }))}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">1.3 Follow Ups</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.follow_ups}
                      onChange={(e) => setFormData(prev => ({ ...prev, follow_ups: parseInt(e.target.value) || 0 }))}
                      placeholder="30"
                      className="flex-1"
                    />
                    <select
                      value={formData.follow_ups_status ? 'yes' : 'no'}
                      onChange={(e) => setFormData(prev => ({ ...prev, follow_ups_status: e.target.value === 'yes' }))}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <Input
                    value={formData.follow_ups_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, follow_ups_description: e.target.value }))}
                    placeholder="Description if required"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inventory & Site Visits Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-primary">2. Inventory & Site Visits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">2.1 Inventories Found</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.inventories_found}
                    onChange={(e) => setFormData(prev => ({ ...prev, inventories_found: parseInt(e.target.value) || 0 }))}
                    placeholder="15"
                    className="flex-1"
                  />
                  <select
                    value={formData.inventories_found_status ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, inventories_found_status: e.target.value === 'yes' }))}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">2.2 Primary Sites Visited</label>
                <Input
                  type="number"
                  value={formData.primary_sites_visited}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_sites_visited: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">2.3 Client Visit</label>
                <Input
                  type="number"
                  value={formData.client_visit}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_visit: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Communications Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-primary">3. Communications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">3.1 Calls Made to Agents</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.calls_to_agents}
                      onChange={(e) => setFormData(prev => ({ ...prev, calls_to_agents: parseInt(e.target.value) || 0 }))}
                      placeholder="4"
                      className="flex-1"
                    />
                    <select
                      value={formData.calls_to_agents_status ? 'yes' : 'no'}
                      onChange={(e) => setFormData(prev => ({ ...prev, calls_to_agents_status: e.target.value === 'yes' }))}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <Input
                    value={formData.agent_names}
                    onChange={(e) => setFormData(prev => ({ ...prev, agent_names: e.target.value }))}
                    placeholder="Agent names"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">3.2 Calls Made to Developers</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.calls_to_developers}
                      onChange={(e) => setFormData(prev => ({ ...prev, calls_to_developers: parseInt(e.target.value) || 0 }))}
                      placeholder="3"
                      className="flex-1"
                    />
                    <select
                      value={formData.calls_to_developers_status ? 'yes' : 'no'}
                      onChange={(e) => setFormData(prev => ({ ...prev, calls_to_developers_status: e.target.value === 'yes' }))}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <Input
                    value={formData.calls_to_developers_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, calls_to_developers_description: e.target.value }))}
                    placeholder="Description (mentioned in workload report)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Digital Marketing Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-primary">4. Digital Marketing Activities</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">4.1 WhatsApp Postings</label>
                <Input
                  type="number"
                  value={formData.whatsapp_postings}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_postings: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.2 Agents Added</label>
                <Input
                  type="number"
                  value={formData.agents_added}
                  onChange={(e) => setFormData(prev => ({ ...prev, agents_added: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.3 Agents Contacted</label>
                <Input
                  type="number"
                  value={formData.agents_contacted}
                  onChange={(e) => setFormData(prev => ({ ...prev, agents_contacted: parseInt(e.target.value) || 0 }))}
                  placeholder="2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.4 Facebook Postings</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.facebook_postings}
                    onChange={(e) => setFormData(prev => ({ ...prev, facebook_postings: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <select
                    value={formData.facebook_postings_status ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, facebook_postings_status: e.target.value === 'yes' }))}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.5 Instagram Posting</label>
                <Input
                  type="number"
                  value={formData.instagram_posting}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram_posting: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.6 99 Acres</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.acres_99_postings}
                    onChange={(e) => setFormData(prev => ({ ...prev, acres_99_postings: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <select
                    value={formData.acres_99_status ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, acres_99_status: e.target.value === 'yes' }))}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.7 Google Reviews</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.google_reviews}
                    onChange={(e) => setFormData(prev => ({ ...prev, google_reviews: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <select
                    value={formData.google_reviews_status ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, google_reviews_status: e.target.value === 'yes' }))}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.8 Surrendered Leads</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.surrendered_leads}
                    onChange={(e) => setFormData(prev => ({ ...prev, surrendered_leads: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="flex-1"
                  />
                  <select
                    value={formData.surrendered_leads_status ? 'yes' : 'no'}
                    onChange={(e) => setFormData(prev => ({ ...prev, surrendered_leads_status: e.target.value === 'yes' }))}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.9 MB Postings</label>
                <Input
                  type="number"
                  value={formData.mb_postings}
                  onChange={(e) => setFormData(prev => ({ ...prev, mb_postings: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">4.10 Website Postings</label>
                <Input
                  type="number"
                  value={formData.website_postings}
                  onChange={(e) => setFormData(prev => ({ ...prev, website_postings: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Email Communications Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-primary">5. Email Communications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">5.1 Mails Sent</label>
                <Input
                  type="number"
                  value={formData.mails_sent}
                  onChange={(e) => setFormData(prev => ({ ...prev, mails_sent: parseInt(e.target.value) || 0 }))}
                  placeholder="01"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">5.2 Cross Pitching Mails</label>
                <Input
                  type="number"
                  value={formData.cross_pitching_mails}
                  onChange={(e) => setFormData(prev => ({ ...prev, cross_pitching_mails: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Legacy Performance Metrics */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-primary">6. Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <TableHead>Leads Reg.</TableHead>
                <TableHead>Inventories</TableHead>
                <TableHead>Site Visits</TableHead>
                <TableHead>Agent Calls</TableHead>
                <TableHead>Developer Calls</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{format(new Date(report.generated_at), 'dd MMM')}</TableCell>
                  <TableCell>{report.reporter?.full_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.data?.leads_registered || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.data?.inventories_found || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.data?.primary_sites_visited || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{report.data?.calls_to_agents || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{report.data?.calls_to_developers || 0}</Badge>
                  </TableCell>
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