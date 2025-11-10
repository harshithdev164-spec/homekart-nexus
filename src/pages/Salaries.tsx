import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Download, Calendar as CalendarIcon, Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department?: string;
}

interface SOPReport {
  id: string;
  report_date: string;
  submitted_by: string;
  status: string;
}

interface SalaryAdjustment {
  employee_id: string;
  amount: number;
  reason: string;
}

const EMPLOYEE_SALARIES: { [key: string]: number } = {
  'shalini': 30000,
  'sonali': 22000,
  'santhosh': 20000,
  'santosh': 20000,
  'sn menon': 30000,
  's n menon': 30000,
  'menon': 30000,
  'jagdeesha': 10000,
  'jagadeesh': 10000,
  'harshith': 20000,
  'harshit': 20000,
};

// Helper function to match employee names flexibly
const getEmployeeSalary = (fullName: string): number => {
  const nameLower = fullName.toLowerCase().trim();
  
  // Direct match
  if (EMPLOYEE_SALARIES[nameLower]) {
    return EMPLOYEE_SALARIES[nameLower];
  }
  
  // Try partial matches (first name, last name)
  const nameParts = nameLower.split(' ');
  for (const part of nameParts) {
    if (EMPLOYEE_SALARIES[part]) {
      return EMPLOYEE_SALARIES[part];
    }
  }
  
  // Try without spaces
  const noSpaces = nameLower.replace(/\s+/g, '');
  if (EMPLOYEE_SALARIES[noSpaces]) {
    return EMPLOYEE_SALARIES[noSpaces];
  }
  
  return 0;
};

const Salaries: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [reports, setReports] = useState<SOPReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [adjustments, setAdjustments] = useState<{ [key: string]: SalaryAdjustment }>({});
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (employeesError) throw employeesError;

      const { data: reportsData, error: reportsError } = await supabase
        .from('sop_reports')
        .select('*')
        .gte('report_date', format(startDate, 'yyyy-MM-dd'))
        .lte('report_date', format(endDate, 'yyyy-MM-dd'));

      if (reportsError) throw reportsError;

      setEmployees(employeesData || []);
      setReports(reportsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch salary data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getWorkingDays = () => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter(day => day.getDay() !== 2); // Exclude Tuesday (2)
  };

  const calculateSalary = (employee: Profile) => {
    const baseSalary = getEmployeeSalary(employee.full_name);
    
    if (baseSalary === 0) {
      return { baseSalary: 0, deduction: 0, finalSalary: 0, missingDays: 0, totalDays: 0, submittedDays: 0 };
    }

    const workingDays = getWorkingDays();
    const totalWorkingDays = workingDays.length;
    const dailyRate = baseSalary / totalWorkingDays;

    const employeeReports = reports.filter(r => r.submitted_by === employee.id);
    const reportDates = new Set(employeeReports.map(r => r.report_date));

    const missingDays = workingDays.filter(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return !reportDates.has(dateStr) && !isAfter(day, new Date());
    }).length;

    let deduction = missingDays * dailyRate;

    // Apply manual adjustments
    if (adjustments[employee.id]) {
      deduction = adjustments[employee.id].amount;
    }

    const finalSalary = Math.max(0, baseSalary - deduction);

    return {
      baseSalary,
      deduction,
      finalSalary,
      missingDays,
      totalDays: totalWorkingDays,
      submittedDays: reportDates.size,
    };
  };

  const handleEditAdjustment = (employee: Profile) => {
    const calculation = calculateSalary(employee);
    setEditingEmployee(employee.id);
    setEditAmount(calculation.deduction.toFixed(2));
    setEditReason(adjustments[employee.id]?.reason || `Missing ${calculation.missingDays} reports`);
  };

  const handleSaveAdjustment = () => {
    if (!editingEmployee) return;

    setAdjustments({
      ...adjustments,
      [editingEmployee]: {
        employee_id: editingEmployee,
        amount: parseFloat(editAmount),
        reason: editReason,
      },
    });

    setEditingEmployee(null);
    setEditAmount('');
    setEditReason('');

    toast({
      title: 'Success',
      description: 'Adjustment saved',
    });
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEditAmount('');
    setEditReason('');
  };

  const exportToExcel = () => {
    try {
      const exportData = employees
        .filter(emp => getEmployeeSalary(emp.full_name) > 0)
        .map(employee => {
          const calculation = calculateSalary(employee);
          return {
            'Employee Name': employee.full_name,
            'Email': employee.email,
            'Department': employee.department || 'N/A',
            'Base Salary (₹)': calculation.baseSalary.toFixed(2),
            'Total Working Days': calculation.totalDays,
            'Reports Submitted': calculation.submittedDays,
            'Missing Reports': calculation.missingDays,
            'Daily Rate (₹)': (calculation.baseSalary / calculation.totalDays).toFixed(2),
            'Deduction (₹)': calculation.deduction.toFixed(2),
            'Final Salary (₹)': calculation.finalSalary.toFixed(2),
            'Adjustment Reason': adjustments[employee.id]?.reason || 'Auto-calculated',
          };
        });

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { width: 20 }, { width: 25 }, { width: 15 }, { width: 15 },
        { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
        { width: 15 }, { width: 15 }, { width: 30 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Salary Report');
      
      XLSX.writeFile(wb, `Salary_Report_${format(startDate, 'MMM-yyyy')}.xlsx`);
      
      toast({
        title: 'Success',
        description: 'Salary report exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground mt-2">Only administrators can view salary information</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const workingDays = getWorkingDays();
  const totalEmployees = employees.filter(emp => getEmployeeSalary(emp.full_name) > 0).length;
  const totalSalaries = employees.reduce((sum, emp) => sum + calculateSalary(emp).finalSalary, 0);
  const totalDeductions = employees.reduce((sum, emp) => sum + calculateSalary(emp).deduction, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Management</h1>
          <p className="text-muted-foreground">Based on daily report submissions (Tuesday is weekly off)</p>
        </div>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              From: {format(startDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && setStartDate(date)}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              To: {format(endDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => date && setEndDate(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Working Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingDays.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">₹{totalDeductions.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalSalaries.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Salary Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Deduction</TableHead>
                <TableHead>Final Salary</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees
                .filter(emp => getEmployeeSalary(emp.full_name) > 0)
                .map((employee) => {
                  const calculation = calculateSalary(employee);
                  const isEditing = editingEmployee === employee.id;

                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.full_name}</div>
                          <div className="text-sm text-muted-foreground">{employee.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>₹{calculation.baseSalary.toLocaleString()}</TableCell>
                      <TableCell>{calculation.totalDays}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{calculation.submittedDays}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={calculation.missingDays > 0 ? "destructive" : "secondary"}>
                          {calculation.missingDays}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24"
                          />
                        ) : (
                          <span className="text-destructive">₹{calculation.deduction.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">
                          ₹{calculation.finalSalary.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveAdjustment}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleEditAdjustment(employee)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingEmployee && (
        <Dialog open={true} onOpenChange={() => handleCancelEdit()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Deduction</DialogTitle>
              <DialogDescription>
                Modify the deduction amount and provide a reason for the adjustment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Deduction Amount (₹)</label>
                <Input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Input
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Enter reason for adjustment"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                <Button onClick={handleSaveAdjustment}>Save Adjustment</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Salaries;
