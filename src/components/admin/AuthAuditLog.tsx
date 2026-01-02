import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, RefreshCw, Clock, User, Globe, LogIn, LogOut, UserPlus, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const AuthAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auth_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setLogs(data || []);
      
      // Fetch user profiles for display
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        const profileMap: Record<string, string> = {};
        (profileData || []).forEach(p => {
          profileMap[p.id] = p.full_name || p.email || p.id.slice(0, 8);
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
  }, []);

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

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Auth Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">Monitor authentication events for diagnostics</p>
        </div>
        <Button onClick={fetchLogs} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Recent Authentication Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No authentication events recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground capitalize">
                          {log.event_type.replace('_', ' ')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {profiles[log.user_id] || log.user_id.slice(0, 8)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {parseUserAgent(log.user_agent)}
                        </span>
                        {log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata) && (log.metadata as Record<string, unknown>).email && (
                          <span className="text-muted-foreground">
                            {String((log.metadata as Record<string, unknown>).email)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthAuditLog;
