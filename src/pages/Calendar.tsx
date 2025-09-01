import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VisitScheduler } from '@/components/scheduling/VisitScheduler';

const Calendar: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <VisitScheduler />
      </div>
    </DashboardLayout>
  );
};

export default Calendar;