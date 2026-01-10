import React from 'react';
import { LayoutDashboard, FileText, Briefcase, Users, MessageSquare, Settings, LogOut, Building2, Shield, UserCog } from 'lucide-react';
import { View } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate, useLocation } from 'react-router-dom';
import logoImage from '@/assets/logo.png';

const Sidebar: React.FC = () => {
  const { userProfile, signOut } = useApp();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: View.DASHBOARD, icon: LayoutDashboard, label: 'Command Center', path: '/app' },
    { id: View.CV_ANALYSIS, icon: FileText, label: 'CV Architect', path: '/app/cv-analysis' },
    { id: View.OPPORTUNITIES, icon: Briefcase, label: 'Opportunity Mining', path: '/app/opportunities' },
    { id: View.RECRUITERS, icon: Users, label: 'Recruiter Agent', path: '/app/recruiters' },
    { id: View.COMMUNICATION, icon: MessageSquare, label: 'Comms Hub', path: '/app/communication' },
    { id: View.DUE_DILIGENCE, icon: Building2, label: 'Due Diligence', path: '/app/due-diligence' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="w-64 bg-background border-r border-border flex flex-col h-screen sticky top-0 hidden md:flex">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 text-primary">
          <img 
            src={logoImage} 
            alt="AutoPilot Pro" 
            className="h-10 w-10 rounded-lg object-cover shadow-lg shadow-primary/20"
          />
          <span className="font-heading font-bold text-foreground tracking-tight">AutoPilot Pro</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === item.path
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            }`}
          >
            <item.icon size={18} className={`transition-colors ${location.pathname === item.path ? 'text-primary' : 'group-hover:text-primary'}`} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {isAdmin && (
          <button
            onClick={() => navigate('/app/admin')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
              location.pathname === '/app/admin'
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            }`}
          >
            <UserCog size={18} className={`transition-colors ${location.pathname === '/app/admin' ? 'text-amber-500' : 'group-hover:text-amber-500'}`} />
            <span>Admin Dashboard</span>
          </button>
        )}

        <button
          onClick={() => navigate('/app/admin/audit-log')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
            location.pathname === '/app/admin/audit-log'
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'text-muted-foreground hover:bg-card hover:text-foreground'
          }`}
        >
          <Shield size={18} className={`transition-colors ${location.pathname === '/app/admin/audit-log' ? 'text-primary' : 'group-hover:text-primary'}`} />
          <span>Audit Log</span>
        </button>

        <button
          onClick={() => navigate('/app/settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
            location.pathname === '/app/settings'
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'text-muted-foreground hover:bg-card hover:text-foreground'
          }`}
        >
          <Settings size={18} className={`transition-colors ${location.pathname === '/app/settings' ? 'text-primary' : 'group-hover:text-primary'}`} />
          <span>Settings</span>
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
        >
          <LogOut size={18} className="group-hover:text-destructive transition-colors" />
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
  );
};

export default Sidebar;
