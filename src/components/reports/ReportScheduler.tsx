import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { ScheduledReport, ReportConfig, ExportFormat } from '@/types/reports';
import { Plus, Trash2, Calendar, Mail } from 'lucide-react';
import { format } from 'date-fns';

export const ReportScheduler: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    reportConfig: null as ReportConfig | null,
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: '09:00',
    recipients: [] as string[],
    format: 'excel' as ExportFormat,
  });

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScheduledReports(data || []);
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch scheduled reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createScheduledReport = async () => {
    if (!formData.reportConfig) {
      toast({
        title: 'Error',
        description: 'Please select a report configuration',
        variant: 'destructive',
      });
      return;
    }

    try {
      const schedule = {
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
        time: formData.time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          report_config: formData.reportConfig,
          schedule,
          recipients: formData.recipients,
          format: formData.format,
          created_by: profile?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Scheduled report created successfully',
      });

      setIsCreating(false);
      setFormData({
        reportConfig: null,
        frequency: 'daily',
        dayOfWeek: 1,
        dayOfMonth: 1,
        time: '09:00',
        recipients: [],
        format: 'excel',
      });
      fetchScheduledReports();
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      toast({
        title: 'Error',
        description: 'Failed to create scheduled report',
        variant: 'destructive',
      });
    }
  };

  const deleteScheduledReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Scheduled report deleted',
      });

      fetchScheduledReports();
    } catch (error) {
      console.error('Error deleting scheduled report:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete scheduled report',
        variant: 'destructive',
      });
    }
  };

  const toggleScheduledReport = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      fetchScheduledReports();
    } catch (error) {
      console.error('Error toggling scheduled report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scheduled report',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Automate report generation and delivery</CardDescription>
            </div>
            <Button onClick={() => setIsCreating(!isCreating)}>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isCreating && (
            <div className="space-y-4 p-4 border rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.frequency === 'weekly' && (
                  <div>
                    <Label>Day of Week</Label>
                    <Select
                      value={formData.dayOfWeek.toString()}
                      onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                        <SelectItem value="0">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div>
                    <Label>Day of Month</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => setFormData({ ...formData, format: value as ExportFormat })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={createScheduledReport}>Create Schedule</Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : scheduledReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled reports. Create one to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledReports.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{schedule.report_config.name}</h4>
                      <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                        {schedule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {schedule.schedule.frequency} at {schedule.schedule.time}
                      </span>
                      {schedule.next_run && (
                        <span className="ml-4">
                          Next run: {format(new Date(schedule.next_run), 'PPpp')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={() => toggleScheduledReport(schedule.id, schedule.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteScheduledReport(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

