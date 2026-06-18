import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { NotificationSystem } from '@/components/notifications/NotificationSystem';
import { CookieConsent } from '@/components/cookies/CookieConsent';
import { EnhancedNotificationCenter } from '@/components/notifications/EnhancedNotificationCenter';
import { MobileBottomNav } from './MobileBottomNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NotificationSystem />
      <EnhancedNotificationCenter />
      <CookieConsent />
      <div className="flex h-[calc(100vh-57px)] md:h-[calc(100vh-73px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 lg:p-6 pb-20 md:pb-4 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};