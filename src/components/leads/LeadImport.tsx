import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{success: number; errors: string[]}>({success: 0, errors: []});

  const handleFileSelection = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an Excel file (.xlsx or .xls)',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const parseExcelFile = (file: File) => {
    console.log('Starting to parse file:', file.name);
    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('FileReader error');
      toast({
        title: 'File reading error',
        description: 'Failed to read the uploaded file',
        variant: 'destructive',
      });
    };

    reader.onload = (e) => {
      try {
        console.log('File read successfully, parsing with XLSX');
        const data = e.target?.result;
        
        if (!data) {
          throw new Error('No data found in file');
        }
        
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellText: false,
          cellDates: true
        });
        
        if (!workbook.SheetNames.length) {
          throw new Error('No sheets found in Excel file');
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          throw new Error('Unable to read worksheet');
        }
        
        // Parse as JSON with proper headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });

        console.log('Parsed JSON data:', jsonData);
        console.log('Number of rows found:', jsonData.length);

        if (jsonData.length < 1) {
          throw new Error('Excel file is empty');
        }
        
        if (jsonData.length < 2) {
          throw new Error('Excel file must contain at least a header row and one data row');
        }

        // Get headers from first row
        const firstRow = jsonData[0] as any[];
        if (!firstRow || firstRow.length === 0) {
          throw new Error('No headers found in Excel file');
        }
        
        const headers = firstRow
          .map(header => header ? header.toString().trim() : '')
          .filter(header => header);
          
        if (headers.length === 0) {
          throw new Error('No valid headers found in Excel file');
        }
        
        console.log('Found headers:', headers);

        const rows = jsonData.slice(1)
          .filter(row => {
            if (!row || !Array.isArray(row)) return false;
            return (row as any[]).some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '');
          })
          .map((row, rowIndex) => {
            const obj: ExcelRow = {};
            try {
              headers.forEach((header, index) => {
                const value = (row as any[])[index];
                if (value !== null && value !== undefined) {
                  obj[header] = value.toString().trim();
                } else {
                  obj[header] = '';
                }
              });
              return obj;
            } catch (err) {
              console.error(`Error processing row ${rowIndex + 2}:`, err);
              throw new Error(`Error in row ${rowIndex + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          });

        console.log('Processed headers:', headers);
        console.log('Processed rows:', rows.length);

        setExcelColumns(headers);
        setExcelData(rows);
        
        // Auto-map common field names
        const autoMapping: FieldMapping = {};
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase().trim();
          if (lowerHeader.includes('name')) autoMapping[header] = 'name';
          if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('contact')) autoMapping[header] = 'phone';
          if (lowerHeader.includes('email') || lowerHeader.includes('mail')) autoMapping[header] = 'email';
          if (lowerHeader.includes('source')) autoMapping[header] = 'source';
          if (lowerHeader.includes('budget')) {
            if (lowerHeader.includes('min') || lowerHeader.includes('from') || lowerHeader.includes('lower')) {
              autoMapping[header] = 'budget_min';
            } else if (lowerHeader.includes('max') || lowerHeader.includes('to') || lowerHeader.includes('upper')) {
              autoMapping[header] = 'budget_max';
            } else {
              autoMapping[header] = 'budget_min'; // Default budget column to min
            }
          }
          if (lowerHeader.includes('location') || lowerHeader.includes('address') || lowerHeader.includes('area')) autoMapping[header] = 'preferred_location';
          if (lowerHeader.includes('property') && lowerHeader.includes('type')) autoMapping[header] = 'property_type';
          if (lowerHeader.includes('note') || lowerHeader.includes('comment') || lowerHeader.includes('remark')) autoMapping[header] = 'notes';
        });
        
        console.log('Auto-mapped fields:', autoMapping);
        setFieldMapping(autoMapping);

        toast({
          title: 'File parsed successfully',
          description: `Found ${rows.length} rows of data with ${headers.length} columns`,
        });
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Detailed error:', errorMessage);
        
        toast({
          title: 'Error parsing file',
          description: `Unable to parse the Excel file: ${errorMessage}`,
          variant: 'destructive',
        });
        
        // Reset state on error
        setFile(null);
        setExcelData([]);
        setExcelColumns([]);
        setFieldMapping({});
      }
    };
    
    // Read as ArrayBuffer for better compatibility
    reader.readAsArrayBuffer(file);
  };

  const validateAndImportLeads = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
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
          errors.push(`Row ${i + 2}: Missing required fields - Name: "${leadData.name || 'empty'}", Phone: "${leadData.phone || 'empty'}"`);
          continue;
        }

        // Clean phone number
        const cleanPhone = leadData.phone.toString().replace(/[^\d+\-\s()]/g, '');
        if (cleanPhone.length < 10) {
          errors.push(`Row ${i + 2}: Invalid phone number "${leadData.phone}"`);
          continue;
        }
        leadData.phone = cleanPhone;

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
        title: 'Import completed successfully',
        description: `Successfully imported ${successCount} leads${errors.length > 0 ? `. ${errors.length} rows had errors.` : ''}`,
      });
      
      // Reset form after successful import
      if (errors.length === 0) {
        resetImport();
      }
    } else if (errors.length > 0) {
      toast({
        title: 'Import failed',
        description: `No leads were imported. Please check the errors and try again.`,
        variant: 'destructive',
      });
    }
  };

  const resetImport = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
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
              <div
                onClick={handleDropZoneClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">Excel files only (.xlsx, .xls)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
              </div>
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
                      value={fieldMapping[column] || 'none'}
                      onValueChange={(value) => {
                        const newMapping = { ...fieldMapping };
                        if (value && value !== 'none') {
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
                        <SelectItem value="none">Don't map</SelectItem>
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
              type="button"
              onClick={validateAndImportLeads}
              disabled={isImporting || !Object.keys(fieldMapping).some(key => fieldMapping[key] === 'name' || fieldMapping[key] === 'phone')}
              className="flex-1"
            >
              {isImporting ? 'Importing...' : `Import ${excelData.length} Leads`}
            </Button>
            <Button type="button" variant="outline" onClick={resetImport}>
              Reset
            </Button>
          </div>
        </>
      )}
    </div>
  );
};