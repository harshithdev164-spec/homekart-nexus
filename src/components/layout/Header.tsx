import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { Bell, Settings, LogOut, User, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TimeTracker } from '@/components/time-tracking/TimeTracker';
import { getPendingDailyTasks, PendingTask } from '@/hooks/useDailyCompletion';

export const Header: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [checkingLogout, setCheckingLogout] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [blockOpen, setBlockOpen] = useState(false);

  const doSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSignOut = async () => {
    // Admins can always log out; everyone else must finish end-of-day tasks first.
    if (!profile || profile.role === 'admin') {
      await doSignOut();
      return;
    }

    setCheckingLogout(true);
    const pending = await getPendingDailyTasks(profile.id);
    setCheckingLogout(false);

    if (pending.length > 0) {
      setPendingTasks(pending);
      setBlockOpen(true);
      return;
    }
    await doSignOut();
  };

  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 md:py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4 ml-12 md:ml-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight">
            Realty <span className="bg-gradient-primary bg-clip-text text-transparent">OS</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <TimeTracker />

          <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile?.email}
                  </p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-light text-primary mt-1">
                    {profile?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); handleSignOut(); }}
                disabled={checkingLogout}
              >
                {checkingLogout ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                <span>{checkingLogout ? 'Checking...' : 'Log out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Logout blocked until end-of-day tasks are done */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Finish before you log out
            </DialogTitle>
            <DialogDescription>
              Please complete the following before logging out for the day:
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 py-2">
            {pendingTasks.map((task) => (
              <li key={task.href} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <span className="text-sm font-medium">{task.label}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setBlockOpen(false); navigate(task.href); }}
                >
                  {task.actionLabel}
                </Button>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};