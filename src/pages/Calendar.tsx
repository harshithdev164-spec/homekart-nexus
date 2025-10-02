import React from 'react';
import { VisitScheduler } from '@/components/scheduling/VisitScheduler';

const Calendar: React.FC = () => {
  return (
    <div className="p-6">
      <VisitScheduler />
    </div>
  );
};

export default Calendar;