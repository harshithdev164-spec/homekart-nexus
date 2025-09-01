import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReportGenerator } from '@/components/reports/ReportGenerator';

const Reports: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <ReportGenerator />
      </div>
    </DashboardLayout>
  );
};

export default Reports;