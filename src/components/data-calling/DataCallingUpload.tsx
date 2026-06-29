import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Upload, FileSpreadsheet, UserCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface TeamMember {
  id: string;
  full_name: string;
  role?: string;
}

interface DataCallingUploadProps {
  onUploaded?: () => void;
}

const detectColumn = (headers: string[], keywords: string[]) =>
  headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k))) || '';

export const DataCallingUpload: React.FC<DataCallingUploadProps> = ({ onUploaded }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [nameColumn, setNameColumn] = useState('');
  const [phoneColumn, setPhoneColumn] = useState('');
  const [title, setTitle] = useState('');
  const [callDate, setCallDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [assignedTo, setAssignedTo] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('is_active', true)
        .order('full_name');
      if (data) setMembers(data as TeamMember[]);
    })();
  }, []);

  const reset = () => {
    setFile(null);
    setColumns([]);
    setRows([]);
    setNameColumn('');
    setPhoneColumn('');
    setTitle('');
    setAssignedTo('');
  };

  const handleFile = (selected: File) => {
    if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: 'Invalid file', description: 'Upload an Excel/CSV file (.xlsx, .xls, .csv)', variant: 'destructive' });
      return;
    }
    setFile(selected);
    setTitle(`Calling Data — ${format(new Date(), 'dd MMM yyyy')}`);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[][];
        if (json.length < 2) throw new Error('File must have a header row and at least one data row');

        const headers = (json[0] as any[])
          .map((h) => (h ? h.toString().trim() : ''))
          .filter((h) => h);

        const dataRows = json.slice(1)
          .filter((row) => Array.isArray(row) && row.some((c) => c !== null && c !== undefined && c.toString().trim() !== ''))
          .map((row) => {
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              const v = (row as any[])[i];
              obj[h] = v !== null && v !== undefined ? v.toString().trim() : '';
            });
            return obj;
          });

        setColumns(headers);
        setRows(dataRows);
        setNameColumn(detectColumn(headers, ['name', 'customer', 'client']));
        setPhoneColumn(detectColumn(headers, ['phone', 'mobile', 'contact', 'number']));
        toast({ title: 'File parsed', description: `${dataRows.length} rows, ${headers.length} columns` });
      } catch (err) {
        console.error(err);
        toast({ title: 'Parse error', description: err instanceof Error ? err.message : 'Failed to read file', variant: 'destructive' });
        reset();
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  const handleUpload = async () => {
    if (!profile?.id) return;
    if (!title.trim()) {
      toast({ title: 'Missing title', description: 'Give this batch a title', variant: 'destructive' });
      return;
    }
    if (!assignedTo) {
      toast({ title: 'Assign required', description: 'Select a team member to assign this batch to', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: batch, error: batchError } = await (supabase as any)
        .from('call_data_batches')
        .insert({
          title: title.trim(),
          file_name: file?.name || null,
          columns,
          total_records: rows.length,
          call_date: callDate,
          assigned_to: assignedTo,
          uploaded_by: profile.id,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const records = rows.map((row) => ({
        batch_id: batch.id,
        assigned_to: assignedTo,
        data: row,
        contact_name: nameColumn ? row[nameColumn] || null : null,
        contact_phone: phoneColumn ? row[phoneColumn] || null : null,
        status: 'pending',
      }));

      // Insert in chunks to stay well within payload limits
      const CHUNK = 500;
      for (let i = 0; i < records.length; i += CHUNK) {
        const { error } = await (supabase as any)
          .from('call_data_records')
          .insert(records.slice(i, i + CHUNK));
        if (error) throw error;
      }

      const member = members.find((m) => m.id === assignedTo);
      toast({
        title: 'Uploaded & assigned',
        description: `${rows.length} records assigned to ${member?.full_name || 'team member'}`,
      });
      reset();
      onUploaded?.();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Upload failed', description: err?.message || 'Could not save batch', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!file) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Calling Data
          </CardTitle>
          <CardDescription>Upload a daily Excel/CSV of customers to call, then assign it to a team member.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/40 hover:bg-muted/70 transition-colors"
          >
            <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, or .csv</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Batch Details & Assignment
          </CardTitle>
          <CardDescription>{rows.length} records · {columns.length} columns from {file.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Batch Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Morning leads — 18 Jun" />
            </div>
            <div className="space-y-2">
              <Label>Call Date</Label>
              <Input type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assign To (team member)</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}{m.role ? ` · ${m.role}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name Column (for display)</Label>
              <Select value={nameColumn || 'none'} onValueChange={(v) => setNameColumn(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone Column (for calling)</Label>
              <Select value={phoneColumn || 'none'} onValueChange={(v) => setPhoneColumn(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>First 5 of {rows.length} rows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>{columns.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => <TableCell key={c} className="whitespace-nowrap">{String(row[c] ?? '')}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleUpload} disabled={saving} className="flex-1">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : `Upload & Assign ${rows.length} Records`}
        </Button>
        <Button variant="outline" onClick={reset} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
};
