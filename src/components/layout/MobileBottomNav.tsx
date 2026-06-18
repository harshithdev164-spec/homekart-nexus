import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, UserCheck, Building2, BarChart3, Settings } from 'lucide-react';

interface MobileNavItem {
    title: string;
    href: string;
    icon: React.ComponentType<any>;
}

const mobileNavigation: MobileNavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: Home },
    { title: 'Leads', href: '/leads', icon: UserCheck },
    { title: 'Properties', href: '/properties', icon: Building2 },
    { title: 'Reports', href: '/reports', icon: BarChart3 },
    { title: 'Settings', href: '/settings', icon: Settings },
];

export const MobileBottomNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {mobileNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.href}
                            onClick={() => navigate(item.href)}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-200",
                                "active:scale-95 touch-manipulation",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn(
                                "h-5 w-5 transition-all",
                                isActive && "scale-110"
                            )} />
                            <span className={cn(
                                "text-xs font-medium transition-all",
                                isActive && "font-semibold"
                            )}>
                                {item.title}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
