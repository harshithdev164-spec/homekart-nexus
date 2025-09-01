import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelRow {
  [key: string]: any;
}

interface FieldMapping {
  [excelColumn: string]: string;
}

const LEAD_FIELDS = {
  name: 'Name (Required)',
  phone: 'Phone (Required)',
  email: 'Email',
  source: 'Source',
  budget_min: 'Min Budget',
  budget_max: 'Max Budget',
  preferred_location: 'Preferred Location',
  property_type: 'Property Type',
  notes: 'Notes'
};

const PROPERTY_TYPES = ['apartment', 'villa', 'plot', 'commercial', 'office', 'warehouse'];

export const LeadImport: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{success: number; errors: string[]}>({success: 0, errors: []});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel file (.xlsx or .xls)',
        variant: 'destructive',
      });
      return;
    }

    setFile(uploadedFile);
    parseExcelFile(uploadedFile);
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast({
            title: 'Invalid file',
            description: 'Excel file must contain at least a header row and one data row',
            variant: 'destructive',
          });
          return;
        }

        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1).map(row => {
          const obj: ExcelRow = {};
          headers.forEach((header, index) => {
            obj[header] = (row as any[])[index] || '';
          });
          return obj;
        });

        setExcelColumns(headers);
        setExcelData(rows);
        
        // Auto-map common field names
        const autoMapping: FieldMapping = {};
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('name')) autoMapping[header] = 'name';
          if (lowerHeader.includes('phone')) autoMapping[header] = 'phone';
          if (lowerHeader.includes('email')) autoMapping[header] = 'email';
          if (lowerHeader.includes('source')) autoMapping[header] = 'source';
          if (lowerHeader.includes('budget')) {
            if (lowerHeader.includes('min')) autoMapping[header] = 'budget_min';
            if (lowerHeader.includes('max')) autoMapping[header] = 'budget_max';
          }
          if (lowerHeader.includes('location')) autoMapping[header] = 'preferred_location';
          if (lowerHeader.includes('property') && lowerHeader.includes('type')) autoMapping[header] = 'property_type';
          if (lowerHeader.includes('notes')) autoMapping[header] = 'notes';
        });
        setFieldMapping(autoMapping);

        toast({
          title: 'File parsed successfully',
          description: `Found ${rows.length} rows of data`,
        });
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast({
          title: 'Error parsing file',
          description: 'Unable to parse the Excel file. Please check the format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateAndImportLeads = async () => {
    if (!profile) return;

    const nameField = Object.keys(fieldMapping).find(key => fieldMapping[key] === 'name');
    const phoneField = Object.keys(fieldMapping).find(key => fieldMapping[key] === 'phone');

    if (!nameField || !phoneField) {
      toast({
        title: 'Missing required fields',
        description: 'Please map both Name and Phone fields',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      
      try {
        const leadData: any = {
          created_by: profile.id,
          status: 'new'
        };

        // Map fields from Excel to lead data
        Object.keys(fieldMapping).forEach(excelCol => {
          const leadField = fieldMapping[excelCol];
          const value = row[excelCol];
          
          if (leadField && value) {
            if (leadField === 'budget_min' || leadField === 'budget_max') {
              const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
              if (!isNaN(numValue)) leadData[leadField] = numValue;
            } else if (leadField === 'property_type') {
              const type = value.toString().toLowerCase();
              if (PROPERTY_TYPES.includes(type)) {
                leadData[leadField] = type;
              }
            } else {
              leadData[leadField] = value.toString().trim();
            }
          }
        });

        // Validate required fields
        if (!leadData.name || !leadData.phone) {
          errors.push(`Row ${i + 2}: Missing name or phone`);
          continue;
        }

        // Insert lead
        const { error } = await supabase
          .from('leads')
          .insert([leadData]);

        if (error) {
          errors.push(`Row ${i + 2}: ${error.message}`);
        } else {
          successCount++;
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setImportResults({ success: successCount, errors });
    setIsImporting(false);

    if (successCount > 0) {
      toast({
        title: 'Import completed',
        description: `Successfully imported ${successCount} leads${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      });
    }
  };

  const resetImport = () => {
    setFile(null);
    setExcelData([]);
    setExcelColumns([]);
    setFieldMapping({});
    setImportResults({success: 0, errors: []});
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Leads from Excel
            </CardTitle>
            <CardDescription>
              Upload an Excel file (.xlsx or .xls) with your leads data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center w-full">
              <Label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">Excel files only (.xlsx, .xls)</p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Field Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Map Excel Columns to Lead Fields</CardTitle>
              <CardDescription>
                Map your Excel columns to the corresponding lead fields. Name and Phone are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {excelColumns.map(column => (
                  <div key={column} className="space-y-2">
                    <Label>Excel Column: "{column}"</Label>
                    <Select
                      value={fieldMapping[column] || ''}
                      onValueChange={(value) => {
                        const newMapping = { ...fieldMapping };
                        if (value) {
                          newMapping[column] = value;
                        } else {
                          delete newMapping[column];
                        }
                        setFieldMapping(newMapping);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lead field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Don't map</SelectItem>
                        {Object.entries(LEAD_FIELDS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                Preview of the first 5 rows from your Excel file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {excelColumns.map(column => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {excelColumns.map(column => (
                          <TableCell key={column}>{row[column]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {excelData.length > 5 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing 5 of {excelData.length} rows
                </p>
              )}
            </CardContent>
          </Card>

          {/* Import Results */}
          {importResults.success > 0 || importResults.errors.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResults.errors.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-green-600">
                    Successfully imported: {importResults.success} leads
                  </p>
                  {importResults.errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-red-600">
                        Errors ({importResults.errors.length}):
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                        {importResults.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={validateAndImportLeads}
              disabled={isImporting || !Object.keys(fieldMapping).some(key => fieldMapping[key] === 'name' || fieldMapping[key] === 'phone')}
              className="flex-1"
            >
              {isImporting ? 'Importing...' : `Import ${excelData.length} Leads`}
            </Button>
            <Button variant="outline" onClick={resetImport}>
              Reset
            </Button>
          </div>
        </>
      )}
    </div>
  );
};