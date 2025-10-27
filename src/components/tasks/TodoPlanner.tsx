import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, CalendarIcon, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assignee?: {
    full_name: string;
  };
}

interface TeamMember {
  id: string;
  full_name: string;
}

const DEFAULT_DAILY_TASKS = [
  { title: 'Morning Team Meeting', description: 'Daily standup with team' },
  { title: 'Check Email & Messages', description: 'Review all communications' },
  { title: 'Follow-up Pending Leads', description: 'Contact leads requiring follow-up' },
  { title: 'Update Lead Status', description: 'Update CRM with latest lead status' },
  { title: 'Property Site Visits', description: 'Conduct scheduled site visits' },
  { title: 'Client Meetings', description: 'Meet with prospective clients' },
  { title: 'Call Log Updates', description: 'Update call logs and notes' },
  { title: 'End of Day Report', description: 'Submit daily activity report' },
];

export const TodoPlanner: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDefaultTasks, setShowDefaultTasks] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedDefaultTasks, setSelectedDefaultTasks] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to: '',
  });

  useEffect(() => {
    if (profile) {
      fetchTasks();
      fetchTeamMembers();
      setupRealtimeSubscription();
    }
  }, [profile]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchTasks = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tasks',
        variant: 'destructive'
      });
    } else {
      // Fetch assignee names separately
      const tasksWithAssignee = await Promise.all((data || []).map(async (task) => {
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', task.assigned_to)
          .single();
        
        return {
          ...task,
          priority: task.priority as 'low' | 'medium' | 'high',
          assignee: assigneeProfile || { full_name: 'Unknown' }
        };
      }));
      setTasks(tasksWithAssignee);
    }
    setLoading(false);
  };

  const fetchTeamMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    
    if (data) setTeamMembers(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const taskData = {
      ...formData,
      assigned_to: formData.assigned_to || profile.id,
      created_by: profile.id,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
    };

    const { error } = await supabase
      .from('tasks')
      .insert(taskData);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Task created successfully'
      });
      resetForm();
      setShowForm(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    // Only admins can mark tasks as complete
    if (profile?.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only admins can mark tasks as complete',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !isCompleted })
      .eq('id', taskId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Task marked as ${!isCompleted ? 'complete' : 'incomplete'}`,
      });
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Task deleted successfully'
      });
    }
  };

  const handleDefaultTasksSubmit = async () => {
    if (!profile || selectedDefaultTasks.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one task',
        variant: 'destructive'
      });
      return;
    }

    try {
      const tasksToInsert = selectedDefaultTasks.map(title => {
        const taskTemplate = DEFAULT_DAILY_TASKS.find(t => t.title === title);
        return {
          title: taskTemplate?.title || title,
          description: taskTemplate?.description || '',
          priority: 'medium' as 'medium',
          assigned_to: profile.id,
          created_by: profile.id,
          due_date: format(new Date(), 'yyyy-MM-dd'),
        };
      });

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Daily plan created with ${selectedDefaultTasks.length} tasks`
      });
      setSelectedDefaultTasks([]);
      setShowDefaultTasks(false);
      await fetchTasks();
    } catch (error) {
      console.error('Error creating daily plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to create daily plan',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
    });
    setDueDate(undefined);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const todayTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    const taskDate = new Date(task.due_date);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  });

  const overdueTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    const taskDate = new Date(task.due_date);
    const today = new Date();
    return taskDate < today && !task.is_completed;
  });

  const upcomingTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    const taskDate = new Date(task.due_date);
    const today = new Date();
    return taskDate > today;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Planner</h2>
          <p className="text-muted-foreground">
            Manage your daily tasks and activities
            {profile?.role !== 'admin' && ' • Only admins can mark tasks as complete'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDefaultTasks(true)}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Daily Plan
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {showDefaultTasks && (
        <Card>
          <CardHeader>
            <CardTitle>Select Your Daily Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {DEFAULT_DAILY_TASKS.map((task) => (
                <div key={task.title} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={selectedDefaultTasks.includes(task.title)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDefaultTasks([...selectedDefaultTasks, task.title]);
                      } else {
                        setSelectedDefaultTasks(selectedDefaultTasks.filter(t => t !== task.title));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleDefaultTasksSubmit}
                disabled={selectedDefaultTasks.length === 0}
              >
                Create Daily Plan ({selectedDefaultTasks.length} tasks)
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDefaultTasks(false);
                  setSelectedDefaultTasks([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Task Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign To</label>
                  <Select value={formData.assigned_to} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={profile?.id || ''}>Myself</SelectItem>
                      {teamMembers.filter(member => member.id !== profile?.id).map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add task description..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Task</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Today's Tasks ({todayTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tasks for today</p>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="relative group">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => toggleTaskCompletion(task.id, task.is_completed)}
                      disabled={profile?.role !== 'admin'}
                      className={profile?.role !== 'admin' ? 'cursor-not-allowed opacity-50' : ''}
                    />
                    {profile?.role !== 'admin' && (
                      <span className="absolute left-0 top-6 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-md whitespace-nowrap z-10">
                        Only admins can mark complete
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", task.is_completed && "line-through text-muted-foreground")}>
                        {task.title}
                      </span>
                      <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      {task.is_completed && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ✓ Completed
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {task.assignee?.full_name || 'Unassigned'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No overdue tasks</p>
            ) : (
              overdueTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="relative group">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => toggleTaskCompletion(task.id, task.is_completed)}
                      disabled={profile?.role !== 'admin'}
                      className={profile?.role !== 'admin' ? 'cursor-not-allowed opacity-50' : ''}
                    />
                    {profile?.role !== 'admin' && (
                      <span className="absolute left-0 top-6 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-md whitespace-nowrap z-10">
                        Only admins can mark complete
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {task.assignee?.full_name || 'Unassigned'}
                      <span>• Due: {format(new Date(task.due_date!), 'MMM dd')}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Upcoming Tasks ({upcomingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming tasks</p>
            ) : (
              upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="relative group">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => toggleTaskCompletion(task.id, task.is_completed)}
                      disabled={profile?.role !== 'admin'}
                      className={profile?.role !== 'admin' ? 'cursor-not-allowed opacity-50' : ''}
                    />
                    {profile?.role !== 'admin' && (
                      <span className="absolute left-0 top-6 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-md whitespace-nowrap z-10">
                        Only admins can mark complete
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", task.is_completed && "line-through text-muted-foreground")}>
                        {task.title}
                      </span>
                      <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {task.assignee?.full_name || 'Unassigned'}
                      {task.due_date && <span>• Due: {format(new Date(task.due_date), 'MMM dd')}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};