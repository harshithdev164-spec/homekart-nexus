import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CallButton } from '@/components/calls/CallButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export const CALL_STATUS_OPTIONS: { value: string; label: string; className: string }[] = [
  { value: 'pending', label: 'Pending', className: 'bg-muted text-muted-foreground' },
  { value: 'connected', label: 'Connected', className: 'bg-blue-500/10 text-blue-500' },
  { value: 'interested', label: 'Interested', className: 'bg-success/10 text-success' },
  { value: 'not_interested', label: 'Not Interested', className: 'bg-destructive/10 text-destructive' },
  { value: 'not_answered', label: 'Not Answered', className: 'bg-warning/10 text-warning' },
  { value: 'busy', label: 'Busy', className: 'bg-orange-500/10 text-orange-500' },
  { value: 'switched_off', label: 'Switched Off', className: 'bg-zinc-500/10 text-zinc-500' },
  { value: 'wrong_number', label: 'Wrong Number', className: 'bg-rose-500/10 text-rose-500' },
  { value: 'call_back', label: 'Call Back Later', className: 'bg-indigo-500/10 text-indigo-500' },
  { value: 'converted', label: 'Converted', className: 'bg-emerald-500/10 text-emerald-500' },
];

const statusClass = (status: string) =>
  CALL_STATUS_OPTIONS.find((s) => s.value === status)?.className || 'bg-muted text-muted-foreground';

export interface CallBatch {
  id: string;
  title: string;
  columns: string[];
  call_date: string;
  total_records: number;
}

interface CallRecord {
  id: string;
  batch_id: string;
  data: Record<string, any>;
  contact_name?: string | null;
  contact_phone?: string | null;
  status: string;
  notes?: string | null;
  called_at?: string | null;
}

interface CallDataRecordsProps {
  batch: CallBatch;
  onChanged?: () => void;
}

export const CallDataRecords: React.FC<CallDataRecordsProps> = ({ batch, onChanged }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('call_data_records')
      .select('*')
      .eq('batch_id', batch.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching call records:', error);
      toast({ title: 'Error', description: 'Failed to load calling records', variant: 'destructive' });
    } else {
      setRecords((data || []) as CallRecord[]);
    }
    setLoading(false);
  }, [batch.id, toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSave = async (record: CallRecord, status: string, notes: string) => {
    const { error } = await (supabase as any)
      .from('call_data_records')
      .update({
        status,
        notes: notes || null,
        called_at: status !== 'pending' ? new Date().toISOString() : record.called_at,
        updated_by: profile?.id || null,
      })
      .eq('id', record.id);

    if (error) {
      console.error('Error updating record:', error);
      toast({ title: 'Error', description: 'Failed to update record', variant: 'destructive' });
      return false;
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, status, notes } : r))
    );
    toast({ title: 'Saved', description: 'Record updated' });
    onChanged?.();
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading records...
      </div>
    );
  }

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No records in this batch.</p>;
  }

  const calledCount = records.filter((r) => r.status !== 'pending').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{calledCount}</span> of {records.length} updated
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {batch.columns.map((col) => (
                <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
              ))}
              <TableHead>Call</TableHead>
              <TableHead className="min-w-[180px]">Status</TableHead>
              <TableHead className="min-w-[220px]">Notes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, idx) => (
              <CallRecordRow
                key={record.id}
                index={idx + 1}
                record={record}
                columns={batch.columns}
                onSave={handleSave}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

interface CallRecordRowProps {
  index: number;
  record: CallRecord;
  columns: string[];
  onSave: (record: CallRecord, status: string, notes: string) => Promise<boolean>;
}

const CallRecordRow: React.FC<CallRecordRowProps> = ({ index, record, columns, onSave }) => {
  const [status, setStatus] = useState(record.status);
  const [notes, setNotes] = useState(record.notes || '');
  const [saving, setSaving] = useState(false);

  const dirty = status !== record.status || (notes || '') !== (record.notes || '');
  const phone = record.contact_phone || '';

  const handleSave = async () => {
    setSaving(true);
    await onSave(record, status, notes);
    setSaving(false);
  };

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{index}</TableCell>
      {columns.map((col) => (
        <TableCell key={col} className="whitespace-nowrap max-w-[220px] truncate" title={String(record.data?.[col] ?? '')}>
          {String(record.data?.[col] ?? '')}
        </TableCell>
      ))}
      <TableCell>
        {phone ? (
          <CallButton phoneNumber={phone} name={record.contact_name || phone} size="sm" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CALL_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <Badge className={cn('px-1.5 py-0', opt.className)} variant="secondary">{opt.label}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          className="h-9"
        />
      </TableCell>
      <TableCell>
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </TableCell>
    </TableRow>
  );
};

export { statusClass };
