import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Home,
  Users,
  Building2,
  UserCheck,
  Activity,
  BarChart3,
  Settings,
  MessageSquare,
  FileText,
  Calendar,
  Store,
  Trophy,
  AlertCircle,
  Plus,
  Megaphone,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  roles?: string[];
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Leads', href: '/leads', icon: UserCheck },
  { title: 'Properties', href: '/properties', icon: Building2 },
  { title: 'Add Listing', href: '/add-listing', icon: Plus },
  { title: 'Magicbricks', href: '/magicbricks', icon: Store },
  { title: '99acres', href: '/99acres', icon: Building2 },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
  { title: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { title: 'Activity Feed', href: '/activity-feed', icon: Activity },
  { title: 'Smart Alerts', href: '/alerts', icon: AlertCircle },
  { title: 'Team', href: '/team', icon: Users },
  { title: 'HR Management', href: '/hr', icon: Users, roles: ['admin'] },
  { title: 'Salaries', href: '/salaries', icon: Users, roles: ['admin'] },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Messages', href: '/messages', icon: MessageSquare },
  { title: 'Marketing', href: '/marketing', icon: Megaphone },
  { title: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export const Sidebar: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(profile?.role as any)
  );

  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col bg-card border-r border-border">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Button
                key={item.href}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-primary text-primary-foreground shadow-primary"
                )}
                onClick={() => navigate(item.href)}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.title}
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};