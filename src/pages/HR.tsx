import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserPlus, Calendar, TrendingUp, FileText, Settings } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

const HR: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [sopReports, setSopReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  
  // Form state for adding employee
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'employee',
    department: '',
    phone: '',
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchEmployees();
      fetchSOPReports();
    }
  }, [profile]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch employees',
          variant: 'destructive',
        });
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSOPReports = async () => {
    try {
      const { data, error } = await supabase
        .from('sop_reports')
        .select(`
          *,
          profiles!sop_reports_submitted_by_fkey(full_name)
        `)
        .gte('report_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('report_date', { ascending: false });

      if (error) {
        console.error('Error fetching SOP reports:', error);
        return;
      }

      setSopReports(data || []);
    } catch (error) {
      console.error('Error fetching SOP reports:', error);
    }
  };

  const handleToggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', employeeId);

      if (error) {
        console.error('Error updating employee status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update employee status',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Employee ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
    }
  };

  const handleUpdateRole = async (employeeId: string, newRole: 'admin' | 'manager' | 'employee') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', employeeId);

      if (error) {
        console.error('Error updating employee role:', error);
        toast({
          title: 'Error',
          description: 'Failed to update employee role',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Employee role updated successfully',
      });

      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee role:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSOPCompletionRate = (employeeId: string) => {
    const employeeReports = sopReports.filter(r => r.submitted_by === employeeId);
    const last7Days = 7;
    const completionRate = (employeeReports.length / last7Days) * 100;
    return Math.min(completionRate, 100);
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access HR management.</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">HR Management</h1>
          <p className="text-muted-foreground">Manage employees, roles, and performance tracking</p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddEmployeeOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Total Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {employees.filter(e => e.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {employees.filter(e => e.role === 'manager').length}
            </div>
            <p className="text-xs text-muted-foreground">Managers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {sopReports.filter(r => r.report_date === new Date().toISOString().split('T')[0]).length}
            </div>
            <p className="text-xs text-muted-foreground">Today's SOP Reports</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Employee Management</TabsTrigger>
          <TabsTrigger value="performance">Performance Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          {/* Employee Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-medium transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className={getRoleColor(employee.role)}>
                        {employee.role}
                      </Badge>
                      <Badge variant={employee.is_active ? "default" : "secondary"}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{employee.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {employee.department && (
                      <div className="text-sm">
                        <span className="font-medium">Department:</span> {employee.department}
                      </div>
                    )}
                    {employee.phone && (
                      <div className="text-sm">
                        <span className="font-medium">Phone:</span> {employee.phone}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Joined: {new Date(employee.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Select
                        value={employee.role}
                        onValueChange={(value) => handleUpdateRole(employee.id, value as 'admin' | 'manager' | 'employee')}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant={employee.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleEmployeeStatus(employee.id, employee.is_active)}
                      >
                        {employee.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.filter(e => e.is_active).map((employee) => {
              const completionRate = getSOPCompletionRate(employee.id);
              const employeeReports = sopReports.filter(r => r.submitted_by === employee.id);
              
              return (
                <Card key={employee.id} className="hover:shadow-medium transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {employee.full_name}
                    </CardTitle>
                    <CardDescription>{employee.role}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">SOP Completion</span>
                        <span className="text-sm font-bold">{completionRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {employeeReports.length} reports in last 30 days
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        Last report: {
                          employeeReports.length > 0 
                            ? new Date(employeeReports[0].report_date).toLocaleDateString()
                            : 'No reports yet'
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee profile. They will receive an invitation email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  placeholder="Employee name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="Department name"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                toast({
                  title: 'Feature Coming Soon',
                  description: 'Employee invitation system will be implemented next',
                });
                setIsAddEmployeeOpen(false);
              }}
              className="w-full"
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HR;