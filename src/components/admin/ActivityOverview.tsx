import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  RefreshCw, 
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  User,
  Clock,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  id: string;
  user_id: string;
  event_type: string;
  user_agent: string | null;
  ip_address: string | null;
  metadata: Json | null;
  created_at: string;
}

const ActivityOverview: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});
  const [filter, setFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('auth_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter !== 'all') {
        query = query.eq('event_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setLogs(data || []);
      
      // Fetch user profiles for display
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        const profileMap: Record<string, { name: string; email: string }> = {};
        (profileData || []).forEach(p => {
          profileMap[p.id] = {
            name: p.full_name || 'Unknown',
            email: p.email
          };
        });
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login': return <LogIn className="w-4 h-4" />;
      case 'logout': return <LogOut className="w-4 h-4" />;
      case 'signup': return <UserPlus className="w-4 h-4" />;
      case 'password_reset': 
      case 'password_update': return <KeyRound className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'login': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'logout': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'signup': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'password_reset':
      case 'password_update': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Browser';
  };

  const eventTypes = ['all', 'login', 'logout', 'signup', 'password_reset', 'password_update'];

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activity Overview
            </CardTitle>
            <CardDescription>
              Monitor all authentication events across the platform
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-wrap">
              {eventTypes.map(type => (
                <Button
                  key={type}
                  variant={filter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(type)}
                  className="capitalize text-xs"
                >
                  {type === 'all' ? 'All Events' : type.replace('_', ' ')}
                </Button>
              ))}
            </div>
            <Button onClick={fetchLogs} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activity found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg border ${getEventColor(log.event_type)}`}>
                    {getEventIcon(log.event_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground capitalize">
                        {log.event_type.replace('_', ' ')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {profiles[log.user_id]?.name || log.user_id.slice(0, 8)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {parseUserAgent(log.user_agent)}
                      </span>
                      {profiles[log.user_id]?.email && (
                        <span className="text-muted-foreground">
                          {profiles[log.user_id].email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Showing {logs.length} events {filter !== 'all' && `(filtered by ${filter})`}
        </p>
      </CardContent>
    </Card>
  );
};

export default ActivityOverview;
