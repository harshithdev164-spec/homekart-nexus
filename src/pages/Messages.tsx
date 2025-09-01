import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TeamChat } from '@/components/messaging/TeamChat';

const Messages: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <TeamChat />
      </div>
    </DashboardLayout>
  );
};

export default Messages;