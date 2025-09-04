import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, CheckCircle, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface SOPReport {
  id: string;
  submitted_by: string;
  report_date: string;
  sop_items: any;
  status: string;
  notes?: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

const defaultSOPItems = [
  'Lead follow-up calls completed',
  'Property visits scheduled',
  'Client requirement updates recorded',
  'Market research conducted',
  'CRM data updated',
  'Team meeting attended',
  'Weekly targets reviewed',
  'Customer feedback collected',
];

const SOPReports: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<SOPReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('sop_reports')
        .select(`
          *,
          profiles(full_name)
        `)
        .order('report_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching SOP reports:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch SOP reports',
          variant: 'destructive',
        });
        return;
      }

      setReports(data || []);
    } catch (error) {
      console.error('Error fetching SOP reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || selectedItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one SOP item',
        variant: 'destructive',
      });
      return;
    }

    try {
      const reportData = {
        submitted_by: profile.id,
        report_date: reportDate,
        sop_items: selectedItems.map(item => ({ item, completed: true })),
        notes: notes.trim() || null,
      };

      const { error } = await supabase
        .from('sop_reports')
        .upsert([reportData], { onConflict: 'submitted_by,report_date' });

      if (error) {
        console.error('Error submitting SOP report:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit SOP report',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'SOP report submitted successfully',
      });

      setIsCreateDialogOpen(false);
      setSelectedItems([]);
      setNotes('');
      setReportDate(new Date().toISOString().split('T')[0]);
      fetchReports();
    } catch (error) {
      console.error('Error submitting SOP report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">SOP Reports</h1>
          <p className="text-muted-foreground">Submit and track daily Standard Operating Procedure completion</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Submit Daily Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Submit SOP Report</DialogTitle>
              <DialogDescription>
                Mark completed SOP items for today's work
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report_date">Report Date</Label>
                <Input
                  id="report_date"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Completed SOP Items</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {defaultSOPItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sop-${index}`}
                        checked={selectedItems.includes(item)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(prev => [...prev, item]);
                          } else {
                            setSelectedItems(prev => prev.filter(i => i !== item));
                          }
                        }}
                      />
                      <Label htmlFor={`sop-${index}`} className="text-sm">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes or comments..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">Submit Report</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {reports.filter(r => r.report_date === new Date().toISOString().split('T')[0]).length}
            </div>
            <p className="text-xs text-muted-foreground">Today's Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'submitted').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-medium transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  SOP Report
                </CardTitle>
                <Badge className={getStatusColor(report.status)}>
                  {report.status}
                </Badge>
              </div>
              <CardDescription>
                {report.profiles?.full_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {new Date(report.report_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {Array.isArray(report.sop_items) ? report.sop_items.length : 0} items completed
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Submitted: {new Date(report.created_at).toLocaleDateString()}
                </div>
                {report.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {report.notes}
                  </p>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Completed Items:</p>
                  <div className="space-y-1">
                    {Array.isArray(report.sop_items) && report.sop_items.slice(0, 3).map((item: any, index: number) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        • {item.item || item}
                      </p>
                    ))}
                    {Array.isArray(report.sop_items) && report.sop_items.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {report.sop_items.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              No SOP reports yet. Submit your first daily report to get started.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Submit First Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SOPReports;