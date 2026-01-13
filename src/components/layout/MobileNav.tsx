import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, FileText, Briefcase, Users, MessageSquare, Settings, LogOut, Building2, Shield, UserCog, CalendarDays } from 'lucide-react';
import { View } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImage from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const MobileNav: React.FC = () => {
  const { userProfile, signOut } = useApp();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { id: View.DASHBOARD, icon: LayoutDashboard, label: 'Command Center', path: '/app' },
    { id: View.CV_ANALYSIS, icon: FileText, label: 'CV Architect', path: '/app/cv-analysis' },
    { id: View.OPPORTUNITIES, icon: Briefcase, label: 'Opportunity Mining', path: '/app/opportunities' },
    { id: View.RECRUITERS, icon: Users, label: 'Recruiter Agent', path: '/app/recruiters' },
    { id: View.COMMUNICATION, icon: MessageSquare, label: 'Comms Hub', path: '/app/communication' },
    { id: View.DUE_DILIGENCE, icon: Building2, label: 'Due Diligence', path: '/app/due-diligence' },
    { id: View.CALENDAR, icon: CalendarDays, label: 'Interview Calendar', path: '/app/calendar' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    setOpen(false);
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 text-primary">
          <img 
            src={logoImage} 
            alt="AutoPilot Pro" 
            className="h-8 w-8 rounded-lg object-cover shadow-lg shadow-primary/20"
          />
          <span className="font-heading font-bold text-foreground text-sm">AutoPilot Pro</span>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-background">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3 text-primary">
                  <img 
                    src={logoImage} 
                    alt="AutoPilot Pro" 
                    className="h-10 w-10 rounded-lg object-cover shadow-lg shadow-primary/20"
                  />
                  <span className="font-heading font-bold text-foreground tracking-tight">AutoPilot Pro</span>
                </div>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.pathname === item.path
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground'
                    }`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-border space-y-2">
                {isAdmin && (
                  <button
                    onClick={() => handleNavigate('/app/admin')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.pathname === '/app/admin'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground'
                    }`}
                  >
                    <UserCog size={18} />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => handleNavigate('/app/admin/audit-log')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname === '/app/admin/audit-log'
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <Shield size={18} />
                  <span>Audit Log</span>
                </button>

                <button
                  onClick={() => handleNavigate('/app/settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname === '/app/settings'
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {userProfile.name ? userProfile.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{userProfile.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{userProfile.title || 'Executive'}</p>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MobileNav;
