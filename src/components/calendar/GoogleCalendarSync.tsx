import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  RefreshCw, 
  Link2, 
  Unlink, 
  Check, 
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GoogleCalendarConnection {
  id: string;
  user_id: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  calendar_id: string;
}

export function GoogleCalendarSync() {
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'to_google' | 'from_google' | 'sync_all'>('sync_all');

  useEffect(() => {
    checkConnection();
    
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      handleOAuthCallback(code);
    }
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('id, user_id, sync_enabled, last_sync_at, calendar_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setConnection(data as GoogleCalendarConnection);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const redirectUri = `${window.location.origin}/app/calendar`;

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { 
          action: 'get_auth_url',
          redirect_uri: redirectUri
        }
      });

      if (error) throw error;

      if (data?.auth_url) {
        window.location.href = data.auth_url;
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error('Error connecting:', error);
      toast.error('Error connecting to Google Calendar');
    } finally {
      setConnecting(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/app/calendar`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { 
          action: 'exchange_code',
          code,
          redirect_uri: redirectUri
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Google Calendar connected successfully!');
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
        checkConnection();
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error('Error in OAuth callback:', error);
      toast.error('Authorization error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      setConnection(null);
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error disconnecting');
    }
  };

  const handleSync = async () => {
    if (!connection) return;
    
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: syncDirection }
      });

      if (error) throw error;

      if (data?.success) {
        const results = data.results;
        let message = '';
        
        if (syncDirection === 'sync_all' && results.to_google && results.from_google) {
          message = `Sync complete! Sent: ${results.to_google.created + results.to_google.updated}, Imported: ${results.from_google.imported}`;
        } else if (results.created !== undefined) {
          message = `Created: ${results.created}, Updated: ${results.updated}`;
        } else if (results.imported !== undefined) {
          message = `Imported: ${results.imported}, Skipped: ${results.skipped}`;
        }
        
        toast.success(message || 'Sync complete!');
        checkConnection();
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast.error('Error syncing');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSyncEnabled = async () => {
    if (!connection) return;
    
    try {
      const { error } = await supabase
        .from('google_calendar_tokens')
        .update({ sync_enabled: !connection.sync_enabled })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection({ ...connection, sync_enabled: !connection.sync_enabled });
      toast.success(connection.sync_enabled ? 'Auto sync disabled' : 'Auto sync enabled');
    } catch (error) {
      console.error('Error toggling sync:', error);
      toast.error('Error changing settings');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>
                Sync your interviews and events
              </CardDescription>
            </div>
          </div>
          {connection ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <Check className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Switch
                  id="sync-enabled"
                  checked={connection.sync_enabled}
                  onCheckedChange={toggleSyncEnabled}
                />
                <Label htmlFor="sync-enabled" className="text-sm">
                  Auto sync
                </Label>
              </div>
              {connection.last_sync_at && (
                <span className="text-xs text-muted-foreground">
                  Last: {format(new Date(connection.last_sync_at), 'MMM dd, yyyy HH:mm')}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm text-muted-foreground">Sync Direction</Label>
              <div className="flex gap-2">
                <Button
                  variant={syncDirection === 'sync_all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSyncDirection('sync_all')}
                  className="flex-1"
                >
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  Bidirectional
                </Button>
                <Button
                  variant={syncDirection === 'to_google' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSyncDirection('to_google')}
                  className="flex-1"
                >
                  <ArrowUp className="h-4 w-4 mr-1" />
                  To Google
                </Button>
                <Button
                  variant={syncDirection === 'from_google' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSyncDirection('from_google')}
                  className="flex-1"
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  From Google
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSync} 
                disabled={syncing}
                className="flex-1"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar for automatic sync of interviews, 
              follow-up reminders, and other events.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ Bidirectional event sync</p>
              <p>✓ Automatic reminders in Google Calendar</p>
              <p>✓ Import existing events</p>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
