import React from 'react';
import { TeamChat } from '@/components/messaging/TeamChat';

const Messages: React.FC = () => {
  return (
    <div className="p-6">
      <TeamChat />
    </div>
  );
};

export default Messages;