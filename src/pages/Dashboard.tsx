import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TodoPlanner } from '@/components/tasks/TodoPlanner';
import { IntegratedDailyReport } from '@/components/reports/IntegratedDailyReport';
import { VisitScheduler } from '@/components/scheduling/VisitScheduler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, FileText, Calendar, BarChart3 } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">CRM Dashboard</h1>
          <p className="text-muted-foreground">Manage your daily tasks, reports, and visits</p>
        </div>

        <Tabs defaultValue="planner" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="planner" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Planner
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="planner">
            <TodoPlanner />
          </TabsContent>
          
          <TabsContent value="reports">
            <IntegratedDailyReport />
          </TabsContent>
          
          <TabsContent value="visits">
            <VisitScheduler />
          </TabsContent>
          
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>View your performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;