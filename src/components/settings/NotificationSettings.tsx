import React, { useState, useEffect } from 'react';
import { Bell, Mail, ShieldCheck, Volume2, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  minMatchScore: number;
  onlyVerified: boolean;
  soundEnabled: boolean;
}

const STORAGE_KEY = 'notification_preferences';

const NotificationSettings: React.FC = () => {
  const { permission, isSupported, requestPermission, sendNotification } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    emailEnabled: true,
    minMatchScore: 70,
    onlyVerified: false,
    soundEnabled: true,
  });
  const [isRequesting, setIsRequesting] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        // Use defaults
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (newPrefs: NotificationPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    toast.success('Notification preferences saved');
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = () => {
    sendNotification({
      title: '🎯 Test Notification',
      body: 'This is how opportunity notifications will appear!',
      icon: '/favicon.png',
      requireInteraction: false,
    });
    toast.success('Test notification sent!');
  };

  const getPermissionStatus = () => {
    if (!isSupported) {
      return { icon: X, text: 'Not Supported', className: 'text-destructive' };
    }
    if (permission === 'granted') {
      return { icon: Check, text: 'Enabled', className: 'text-success' };
    }
    if (permission === 'denied') {
      return { icon: X, text: 'Blocked', className: 'text-destructive' };
    }
    return { icon: Bell, text: 'Not Set', className: 'text-muted-foreground' };
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notification Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how you receive opportunity alerts
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted ${status.className}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{status.text}</span>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Browser Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive instant alerts when new opportunities are found
            </p>
          </div>
          <div className="flex items-center gap-3">
            {permission !== 'granted' && isSupported && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestPermission}
                disabled={isRequesting || permission === 'denied'}
              >
                {isRequesting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                {permission === 'denied' ? 'Blocked in Browser' : 'Enable'}
              </Button>
            )}
            {permission === 'granted' && (
              <>
                <Switch
                  checked={preferences.pushEnabled}
                  onCheckedChange={(checked) => savePreferences({ ...preferences, pushEnabled: checked })}
                />
                <Button variant="ghost" size="sm" onClick={handleTestNotification}>
                  Test
                </Button>
              </>
            )}
          </div>
        </div>

        {permission === 'denied' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            Push notifications are blocked. Please enable them in your browser settings to receive alerts.
          </div>
        )}
      </div>

      {/* Email Notifications */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="space-y-0.5">
          <Label className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            Get email alerts for high-match opportunities
          </p>
        </div>
        <Switch
          checked={preferences.emailEnabled}
          onCheckedChange={(checked) => savePreferences({ ...preferences, emailEnabled: checked })}
        />
      </div>

      {/* Minimum Match Score */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Minimum Match Score</Label>
            <p className="text-sm text-muted-foreground">
              Only notify for opportunities with at least this match score
            </p>
          </div>
          <span className="text-lg font-semibold text-primary">{preferences.minMatchScore}%</span>
        </div>
        <Slider
          value={[preferences.minMatchScore]}
          onValueChange={([value]) => savePreferences({ ...preferences, minMatchScore: value })}
          min={50}
          max={95}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>50% (More alerts)</span>
          <span>95% (Fewer alerts)</span>
        </div>
      </div>

      {/* Verified Only */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="space-y-0.5">
          <Label className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            Verified Opportunities Only
          </Label>
          <p className="text-sm text-muted-foreground">
            Only notify for verified job listings from trusted sources
          </p>
        </div>
        <Switch
          checked={preferences.onlyVerified}
          onCheckedChange={(checked) => savePreferences({ ...preferences, onlyVerified: checked })}
        />
      </div>

      {/* Sound */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="space-y-0.5">
          <Label className="text-base flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Notification Sound
          </Label>
          <p className="text-sm text-muted-foreground">
            Play a sound when notifications arrive
          </p>
        </div>
        <Switch
          checked={preferences.soundEnabled}
          onCheckedChange={(checked) => savePreferences({ ...preferences, soundEnabled: checked })}
        />
      </div>
    </div>
  );
};

export default NotificationSettings;
