import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { PhoneCall, ChevronDown, ChevronRight, CalendarDays, User, Loader2 } from 'lucide-react';
import { DataCallingUpload } from '@/components/data-calling/DataCallingUpload';
import { CallDataRecords, CallBatch } from '@/components/data-calling/CallDataRecords';

interface Batch extends CallBatch {
  file_name?: string | null;
  assigned_to?: string | null;
  assigned?: { full_name: string } | null;
}

const DataCalling: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('call_data_batches')
      .select('*, assigned:profiles!call_data_batches_assigned_to_fkey(full_name)')
      .order('call_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching batches:', error);
      toast({ title: 'Error', description: 'Failed to load calling batches', variant: 'destructive' });
    } else {
      setBatches((data || []) as Batch[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const batchList = (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
        </div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isAdmin
              ? 'No calling data uploaded yet. Use "Upload & Assign" to add a batch.'
              : 'No calling data has been assigned to you yet.'}
          </CardContent>
        </Card>
      ) : (
        batches.map((batch) => {
          const isOpen = expanded === batch.id;
          return (
            <Card key={batch.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : batch.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <PhoneCall className="h-4 w-4 text-primary" />
                    {batch.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant="secondary" className="gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {batch.call_date ? format(parseISO(batch.call_date), 'dd MMM yyyy') : '—'}
                    </Badge>
                    {isAdmin && (
                      <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" />
                        {batch.assigned?.full_name || 'Unassigned'}
                      </Badge>
                    )}
                    <Badge>{batch.total_records} records</Badge>
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent>
                  <CallDataRecords
                    batch={{
                      id: batch.id,
                      title: batch.title,
                      columns: Array.isArray(batch.columns) ? batch.columns : [],
                      call_date: batch.call_date,
                      total_records: batch.total_records,
                    }}
                  />
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Data Calling</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin
            ? 'Upload daily calling sheets, assign them to your team, and track call progress.'
            : 'Call through your assigned customers and update each record’s status.'}
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="batches" className="w-full">
          <TabsList>
            <TabsTrigger value="batches">Calling Panel</TabsTrigger>
            <TabsTrigger value="upload">Upload &amp; Assign</TabsTrigger>
          </TabsList>
          <TabsContent value="batches" className="space-y-4 pt-2">{batchList}</TabsContent>
          <TabsContent value="upload" className="pt-2">
            <DataCallingUpload onUploaded={fetchBatches} />
          </TabsContent>
        </Tabs>
      ) : (
        batchList
      )}
    </div>
  );
};

export default DataCalling;
