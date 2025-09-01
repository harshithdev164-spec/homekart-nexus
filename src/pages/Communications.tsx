import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LeadMessaging } from '@/components/communications/LeadMessaging';

const Communications: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <LeadMessaging />
      </div>
    </DashboardLayout>
  );
};

export default Communications;