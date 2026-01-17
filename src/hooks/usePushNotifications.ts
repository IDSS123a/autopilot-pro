import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Push notifications enabled!');
        return true;
      } else if (result === 'denied') {
        toast.error('Push notifications were denied');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((options: NotificationOptions): Notification | null => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available or not permitted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        badge: options.badge,
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        data: options.data,
      });

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const notifyHighMatchOpportunity = useCallback((opportunity: {
    title: string;
    company: string;
    match_score: number;
    data_quality?: string;
    id?: string;
  }) => {
    const qualityLabel = opportunity.data_quality === 'verified' 
      ? '✅ VERIFIED' 
      : opportunity.data_quality === 'scraped' 
        ? '📊 Scraped' 
        : '🤖 AI';

    return sendNotification({
      title: `🎯 ${opportunity.match_score}% Match Found!`,
      body: `${opportunity.title} at ${opportunity.company} ${qualityLabel}`,
      icon: '/favicon.png',
      tag: `opportunity-${opportunity.id || Date.now()}`,
      requireInteraction: true,
      data: {
        url: '/app/opportunities',
        opportunityId: opportunity.id,
      },
    });
  }, [sendNotification]);

  const notifyVerifiedOpportunity = useCallback((opportunity: {
    title: string;
    company: string;
    location?: string;
    id?: string;
  }) => {
    return sendNotification({
      title: '✅ New Verified Opportunity',
      body: `${opportunity.title} at ${opportunity.company}${opportunity.location ? ` • ${opportunity.location}` : ''}`,
      icon: '/favicon.png',
      tag: `verified-${opportunity.id || Date.now()}`,
      requireInteraction: false,
      data: {
        url: '/app/opportunities',
        opportunityId: opportunity.id,
      },
    });
  }, [sendNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    notifyHighMatchOpportunity,
    notifyVerifiedOpportunity,
  };
};

export default usePushNotifications;
