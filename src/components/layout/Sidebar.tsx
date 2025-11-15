import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Home,
  Users,
  Building2,
  Building,
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
  ChevronLeft,
  ChevronRight,
  Search,
  X,
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
  { title: '99acres', href: '/99acres', icon: Building },
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
  { title: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin'] },
];

export const Sidebar: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredNavigation = navigation.filter(item => 
    (!item.roles || item.roles.includes(profile?.role as any)) &&
    (!searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
      // B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed(!isCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showSearch, isCollapsed]);

  return (
    <div className={cn(
      "flex h-full flex-col bg-card border-r border-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">HomeKart</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-2 border-b border-border">
          {showSearch ? (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setShowSearch(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              Search... <kbd className="ml-auto hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 flex flex-col pt-2 pb-4 overflow-y-auto">
        <nav className="flex-1 px-2 space-y-1">
          {filteredNavigation.length > 0 ? (
            filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all",
                    isActive && "bg-primary text-primary-foreground shadow-primary",
                    isCollapsed && "justify-center px-0"
                  )}
                  onClick={() => {
                    navigate(item.href);
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className={cn("flex-shrink-0", isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5")} />
                  {!isCollapsed && item.title}
                </Button>
              );
            })
          ) : (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </nav>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Press <kbd className="px-1 py-0.5 rounded bg-muted">⌘K</kbd> to search</p>
            <p>Press <kbd className="px-1 py-0.5 rounded bg-muted">⌘B</kbd> to toggle</p>
          </div>
        </div>
      )}
    </div>
  );
};