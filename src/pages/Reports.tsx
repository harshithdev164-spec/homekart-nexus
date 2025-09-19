import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { IntegratedDailyReport } from '@/components/reports/IntegratedDailyReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3 } from 'lucide-react';

const Reports: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Daily Reports
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics & Reports
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="space-y-0">
            <IntegratedDailyReport />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-0">
            <ReportGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;