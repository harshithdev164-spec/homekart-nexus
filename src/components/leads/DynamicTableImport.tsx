import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Upload, Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelRow {
  [key: string]: any;
}

interface ColumnType {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'NUMERIC' | 'BOOLEAN' | 'TIMESTAMP' | 'DATE';
  nullable: boolean;
}

interface TableStructure {
  tableName: string;
  columns: ColumnType[];
}

const detectColumnType = (values: any[]): ColumnType['type'] => {
  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonEmptyValues.length === 0) return 'TEXT';
  
  // Check for boolean
  const booleanPattern = /^(true|false|yes|no|1|0)$/i;
  if (nonEmptyValues.every(v => booleanPattern.test(String(v)))) return 'BOOLEAN';
  
  // Check for date
  const dateValues = nonEmptyValues.filter(v => !isNaN(Date.parse(String(v))));
  if (dateValues.length === nonEmptyValues.length && dateValues.length > 0) {
    // Check if it looks like a timestamp (has time component)
    const hasTime = nonEmptyValues.some(v => String(v).includes(':'));
    return hasTime ? 'TIMESTAMP' : 'DATE';
  }
  
  // Check for integer
  const integerPattern = /^-?\d+$/;
  if (nonEmptyValues.every(v => integerPattern.test(String(v)))) return 'INTEGER';
  
  // Check for numeric (decimal)
  const numericPattern = /^-?\d*\.?\d+$/;
  if (nonEmptyValues.every(v => numericPattern.test(String(v)))) return 'NUMERIC';
  
  return 'TEXT';
};

export const DynamicTableImport: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [tableStructure, setTableStructure] = useState<TableStructure>({
    tableName: '',
    columns: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [creationResults, setCreationResults] = useState<{success: boolean; message: string; tableName?: string}>({success: false, message: ''});

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
    console.log('Starting to parse file for dynamic table:', file.name);
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
        
        // Analyze data and suggest column types
        const columns: ColumnType[] = headers.map(header => {
          const columnValues = rows.map(row => row[header]);
          const hasEmptyValues = columnValues.some(v => v === '' || v === null || v === undefined);
          
          return {
            name: header.toLowerCase().replace(/[^a-z0-9_]/g, '_'), // Convert to valid SQL column name
            type: detectColumnType(columnValues),
            nullable: hasEmptyValues
          };
        });
        
        // Generate table name from file name
        const suggestedTableName = file.name
          .replace(/\.(xlsx|xls)$/i, '')
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .substring(0, 50); // Limit length
        
        setTableStructure({
          tableName: suggestedTableName,
          columns
        });

        toast({
          title: 'File analyzed successfully',
          description: `Found ${rows.length} rows with ${headers.length} columns. Table structure detected.`,
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
        setTableStructure({ tableName: '', columns: [] });
      }
    };
    
    // Read as ArrayBuffer for better compatibility
    reader.readAsArrayBuffer(file);
  };

  const createTableAndImportData = async () => {
    if (!profile || !tableStructure.tableName || tableStructure.columns.length === 0) return;

    setIsCreating(true);
    
    try {
      // Create SQL for table creation
      const columnDefinitions = tableStructure.columns.map(col => {
        const nullable = col.nullable ? '' : ' NOT NULL';
        let sqlType = '';
        
        // Map TypeScript types to SQL types
        switch (col.type) {
          case 'TEXT':
            sqlType = 'TEXT';
            break;
          case 'NUMERIC':
            sqlType = 'NUMERIC';
            break;
          case 'INTEGER':
            sqlType = 'INTEGER';
            break;
          case 'BOOLEAN':
            sqlType = 'BOOLEAN';
            break;
          case 'DATE':
            sqlType = 'DATE';
            break;
          case 'TIMESTAMP':
            sqlType = 'TIMESTAMP WITH TIME ZONE';
            break;
          default:
            sqlType = 'TEXT';
        }
        
        return `${col.name} ${sqlType}${nullable}`;
      }).join(',\n  ');

      const createTableSQL = `
        -- Create the table
        CREATE TABLE IF NOT EXISTS public.${tableStructure.tableName} (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          ${columnDefinitions},
          created_by UUID REFERENCES public.profiles(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );

        -- Enable Row Level Security
        ALTER TABLE public.${tableStructure.tableName} ENABLE ROW LEVEL SECURITY;

        -- Create policies
        CREATE POLICY "Users can view all records in ${tableStructure.tableName}" 
        ON public.${tableStructure.tableName} 
        FOR SELECT 
        USING (true);

        CREATE POLICY "Users can create records in ${tableStructure.tableName}" 
        ON public.${tableStructure.tableName} 
        FOR INSERT 
        WITH CHECK (created_by IN ( SELECT profiles.id
           FROM profiles
          WHERE (profiles.user_id = auth.uid())));

        CREATE POLICY "Users can update their own records in ${tableStructure.tableName}" 
        ON public.${tableStructure.tableName} 
        FOR UPDATE 
        USING (created_by IN ( SELECT profiles.id
           FROM profiles
          WHERE (profiles.user_id = auth.uid())));

        -- Add trigger for automatic timestamp updates
        CREATE TRIGGER update_${tableStructure.tableName}_updated_at
        BEFORE UPDATE ON public.${tableStructure.tableName}
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
      `;

      console.log('Creating table with SQL:', createTableSQL);

      // Use edge function to execute SQL
      const { data, error: sqlError } = await supabase.functions.invoke('execute-sql', { 
        body: { sql: createTableSQL }
      });

      if (sqlError) {
        throw new Error(`Failed to create table: ${sqlError.message || 'Unknown error'}`);
      }

      if (data?.error) {
        throw new Error(`Failed to create table: ${data.error}`);
      }

      setCreationResults({
        success: true,
        message: `Table '${tableStructure.tableName}' created successfully!`,
        tableName: tableStructure.tableName
      });

      // Now import the data
      setIsImporting(true);
      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        try {
          const insertData: any = {
            created_by: profile.id
          };

          // Map data according to column structure
          tableStructure.columns.forEach(col => {
            const originalHeader = excelColumns.find(h => 
              h.toLowerCase().replace(/[^a-z0-9_]/g, '_') === col.name
            );
            
            if (originalHeader && row[originalHeader] !== undefined && row[originalHeader] !== '') {
              let value = row[originalHeader];
              
              // Convert data types
              if (col.type === 'INTEGER') {
                const intValue = parseInt(value);
                if (!isNaN(intValue)) insertData[col.name] = intValue;
              } else if (col.type === 'NUMERIC') {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) insertData[col.name] = numValue;
              } else if (col.type === 'BOOLEAN') {
                const boolValue = /^(true|yes|1)$/i.test(value);
                insertData[col.name] = boolValue;
              } else if (col.type === 'DATE' || col.type === 'TIMESTAMP') {
                const dateValue = new Date(value);
                if (!isNaN(dateValue.getTime())) {
                  insertData[col.name] = dateValue.toISOString();
                }
              } else {
                insertData[col.name] = value.toString();
              }
            }
          });

          // Insert into the new table using any method (since it's a dynamic table)
          const { error } = await supabase
            .from(tableStructure.tableName as any)
            .insert([insertData]);

          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setCreationResults(prev => ({
        ...prev,
        message: `${prev.message} Successfully imported ${successCount} rows${errors.length > 0 ? ` with ${errors.length} errors` : ''}.`
      }));

      if (successCount > 0) {
        toast({
          title: 'Import completed',
          description: `Successfully created table and imported ${successCount} rows${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
        });
      }

    } catch (error) {
      console.error('Error creating table:', error);
      setCreationResults({
        success: false,
        message: `Failed to create table: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      toast({
        title: 'Error',
        description: `Failed to create table: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setExcelData([]);
    setExcelColumns([]);
    setTableStructure({ tableName: '', columns: [] });
    setCreationResults({ success: false, message: '' });
  };

  const updateTableName = (newName: string) => {
    const sanitizedName = newName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setTableStructure(prev => ({ ...prev, tableName: sanitizedName }));
  };

  const updateColumnType = (columnName: string, newType: ColumnType['type']) => {
    setTableStructure(prev => ({
      ...prev,
      columns: prev.columns.map(col => 
        col.name === columnName ? { ...col, type: newType } : col
      )
    }));
  };

  const updateColumnNullable = (columnName: string, nullable: boolean) => {
    setTableStructure(prev => ({
      ...prev,
      columns: prev.columns.map(col => 
        col.name === columnName ? { ...col, nullable } : col
      )
    }));
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Create Table from Excel
            </CardTitle>
            <CardDescription>
              Upload an Excel file to automatically create a database table and import your data
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
          {/* Table Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configure Table Structure</CardTitle>
              <CardDescription>
                Review and customize the table structure before creation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tableName">Table Name</Label>
                <Input
                  id="tableName"
                  value={tableStructure.tableName}
                  onChange={(e) => updateTableName(e.target.value)}
                  placeholder="Enter table name"
                />
              </div>
              
              <div>
                <Label>Column Configuration</Label>
                <div className="space-y-3 mt-2">
                  {tableStructure.columns.map((column, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-3 border rounded">
                      <div>
                        <Label className="text-sm font-medium">{column.name}</Label>
                        <p className="text-xs text-muted-foreground">
                          Original: {excelColumns[index]}
                        </p>
                      </div>
                      <Select
                        value={column.type}
                        onValueChange={(value) => updateColumnType(column.name, value as ColumnType['type'])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TEXT">Text</SelectItem>
                          <SelectItem value="INTEGER">Integer</SelectItem>
                          <SelectItem value="NUMERIC">Number</SelectItem>
                          <SelectItem value="BOOLEAN">Boolean</SelectItem>
                          <SelectItem value="DATE">Date</SelectItem>
                          <SelectItem value="TIMESTAMP">Timestamp</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`nullable-${index}`}
                          checked={column.nullable}
                          onChange={(e) => updateColumnNullable(column.name, e.target.checked)}
                        />
                        <Label htmlFor={`nullable-${index}`} className="text-sm">Nullable</Label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>
                Preview of the first 5 rows that will be imported
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

          {/* Creation Results */}
          {creationResults.message && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {creationResults.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {creationResults.success ? 'Success' : 'Error'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={creationResults.success ? 'text-green-600' : 'text-red-600'}>
                  {creationResults.message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={createTableAndImportData}
              disabled={isCreating || isImporting || !tableStructure.tableName}
              className="flex-1"
            >
              {isCreating || isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isCreating ? 'Creating Table...' : 'Importing Data...'}
                </>
              ) : (
                `Create Table & Import ${excelData.length} Rows`
              )}
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