import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Activity, 
  RefreshCw, 
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from './UserManagement';
import ActivityOverview from './ActivityOverview';
import UserStats from './UserStats';

const AdminDashboard: React.FC = () => {
  const { user } = useApp();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/app');
    }
  }, [isAdmin, roleLoading, navigate]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
        <Button onClick={() => navigate('/app')}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, assign roles, and monitor platform activity
          </p>
        </div>
      </div>

      {/* User Statistics */}
      <UserStats />

      {/* Tabs for User Management and Activity */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
