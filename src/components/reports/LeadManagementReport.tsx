import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ReportViewer } from './ReportViewer';
import { generateReport, getDateRange } from '@/services/reportService';
import { ReportConfig, ReportData, TimeRange } from '@/types/reports';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const LeadManagementReport: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportType, setReportType] = useState<'lead_source' | 'lead_lifecycle' | 'detailed_leads'>('lead_source');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  const generateReportData = async () => {
    setLoading(true);
    try {
      const dateRange = timeRange === 'custom' && customDateRange.start && customDateRange.end
        ? { startDate: customDateRange.start, endDate: customDateRange.end }
        : getDateRange(timeRange);

      const filters: any = {
        timeRange,
        dateRange,
      };

      // Add filters for detailed leads report
      if (reportType === 'detailed_leads') {
        if (selectedEmployee !== 'all') {
          filters.employeeIds = [selectedEmployee];
        }
        if (selectedStatus !== 'all') {
          filters.statuses = [selectedStatus];
        }
        if (selectedSource !== 'all') {
          filters.leadSources = [selectedSource];
        }
      }

      const config: ReportConfig = {
        name: reportType === 'lead_source' 
          ? 'Lead Source Report' 
          : reportType === 'lead_lifecycle'
          ? 'Lead Lifecycle Report'
          : 'Detailed Leads Report',
        category: 'lead_management',
        type: reportType,
        filters,
        fields: [],
        chartType: reportType === 'lead_source' ? 'bar' : reportType === 'lead_lifecycle' ? 'funnel' : 'table',
        createdBy: profile?.id || '',
      };

      const data = await generateReport(config);
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    generateReportData();
  }, [reportType, timeRange, selectedEmployee, selectedStatus, selectedSource]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    
    if (data) setEmployees(data);
  };

  const handleExport = (format: string) => {
    toast({
      title: 'Export',
      description: `Exporting to ${format}...`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Management Report</CardTitle>
          <CardDescription>Lead source effectiveness and lifecycle analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs value={reportType} onValueChange={(value) => setReportType(value as any)}>
              <TabsList>
                <TabsTrigger value="lead_source">Lead Source</TabsTrigger>
                <TabsTrigger value="lead_lifecycle">Lifecycle Analysis</TabsTrigger>
                <TabsTrigger value="detailed_leads">Detailed Leads</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Time Range</label>
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === 'detailed_leads' && (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Assigned To</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                        <SelectItem value="closed_lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Source</label>
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="magicbricks">MagicBricks</SelectItem>
                        <SelectItem value="99acres">99acres</SelectItem>
                        <SelectItem value="direct">Direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {timeRange === 'custom' && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.start ? format(customDateRange.start, 'PPP') : 'Start Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customDateRange.start || undefined}
                        onSelect={(date) => setCustomDateRange({ ...customDateRange, start: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.end ? format(customDateRange.end, 'PPP') : 'End Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={customDateRange.end || undefined}
                        onSelect={(date) => setCustomDateRange({ ...customDateRange, end: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}

              <Button onClick={generateReportData} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <ReportViewer
          reportData={reportData}
          loading={loading}
          onExport={handleExport}
          onRefresh={generateReportData}
        />
      )}
    </div>
  );
};

