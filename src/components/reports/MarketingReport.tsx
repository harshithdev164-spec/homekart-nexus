import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ReportViewer } from './ReportViewer';
import { generateReport, getDateRange } from '@/services/reportService';
import { ReportConfig, ReportData, TimeRange } from '@/types/reports';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export const MarketingReport: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const generateReportData = async () => {
    setLoading(true);
    try {
      const dateRange = timeRange === 'custom' && customDateRange.start && customDateRange.end
        ? { startDate: customDateRange.start, endDate: customDateRange.end }
        : getDateRange(timeRange);

      const config: ReportConfig = {
        name: 'Marketing Campaign Report',
        category: 'marketing',
        type: 'campaign_performance',
        filters: {
          timeRange,
          dateRange,
        },
        fields: ['name', 'type', 'sent', 'opened', 'clicked', 'converted', 'roi'],
        chartType: 'bar',
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
    generateReportData();
  }, [timeRange]);

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
          <CardTitle>Marketing Campaign Report</CardTitle>
          <CardDescription>Campaign performance, ROI, and conversion metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
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

