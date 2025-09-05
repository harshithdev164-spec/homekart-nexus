import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, CheckCircle, Clock, FileText, Upload, X, Download, Image, File } from 'lucide-react';
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
  files?: string[];
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  // Real-time subscription for SOP reports
  useEffect(() => {
    const channel = supabase
      .channel('sop_reports_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sop_reports'
        },
        (payload) => {
          console.log('SOP report updated:', payload);
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('sop_reports')
        .select(`
          *,
          profiles!sop_reports_submitted_by_fkey(full_name)
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

    setUploading(true);

    try {
      let uploadedFilePaths: string[] = [];

      // Upload files if any
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.user_id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('sop-reports')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast({
              title: 'Error',
              description: `Failed to upload ${file.name}`,
              variant: 'destructive',
            });
            continue;
          }

          uploadedFilePaths.push(fileName);
        }
      }

      const reportData = {
        submitted_by: profile.id,
        report_date: reportDate,
        sop_items: selectedItems.map(item => ({ item, completed: true })),
        notes: notes.trim() || null,
        files: uploadedFilePaths,
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
      setUploadedFiles([]);
      setReportDate(new Date().toISOString().split('T')[0]);
      fetchReports();
    } catch (error) {
      console.error('Error submitting SOP report:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 10MB`,
          variant: 'destructive',
        });
        return false;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported file type`,
          variant: 'destructive',
        });
        return false;
      }

      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const downloadFile = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('sop-reports')
        .download(filePath);

      if (error) {
        console.error('Error downloading file:', error);
        toast({
          title: 'Error',
          description: 'Failed to download file',
          variant: 'destructive',
        });
        return;
      }

      const fileName = filePath.split('/').pop() || 'download';
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (imageTypes.includes(ext || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
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
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

              <div className="space-y-2">
                <Label>Supporting Files</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <div className="text-sm">
                      <label htmlFor="file-upload" className="cursor-pointer text-primary hover:text-primary/80">
                        Click to upload files
                      </label>
                      <p className="text-muted-foreground">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, PDF, Excel, Word up to 10MB each
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.xlsx,.xls,.docx,.doc,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Files:</Label>
                    <div className="space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.name)}
                            <span className="truncate">{file.name}</span>
                            <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Submit Report'}
                </Button>
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
                    <span className="font-medium">Notes:</span> {report.notes}
                  </p>
                )}
                
                {report.files && report.files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Attached Files:</p>
                    <div className="space-y-1">
                      {report.files.slice(0, 3).map((filePath, index) => {
                        const fileName = filePath.split('/').pop() || filePath;
                        return (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              {getFileIcon(fileName)}
                              <span className="truncate max-w-[150px]">{fileName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(filePath)}
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                      {report.files.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          ...and {report.files.length - 3} more files
                        </p>
                      )}
                    </div>
                  </div>
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