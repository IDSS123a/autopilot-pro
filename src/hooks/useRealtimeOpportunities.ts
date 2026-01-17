import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';

interface OpportunityPayload {
  id: string;
  company_name: string;
  position_title: string;
  location: string | null;
  match_score: number | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  minMatchScore: number;
  onlyVerified: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  minMatchScore: 70,
  onlyVerified: false,
};

export const useRealtimeOpportunities = (
  userId: string | undefined,
  preferences: Partial<NotificationPreferences> = {}
) => {
  const { notifyHighMatchOpportunity, notifyVerifiedOpportunity, permission } = usePushNotifications();
  const prefs = { ...DEFAULT_PREFERENCES, ...preferences };
  const processedIds = useRef<Set<string>>(new Set());

  const parseDataQuality = (notes: string | null): string | undefined => {
    if (!notes) return undefined;
    try {
      const parsed = JSON.parse(notes);
      return parsed.data_quality;
    } catch {
      return undefined;
    }
  };

  const shouldNotify = useCallback((opportunity: OpportunityPayload): boolean => {
    // Already processed
    if (processedIds.current.has(opportunity.id)) {
      return false;
    }

    const matchScore = opportunity.match_score || 0;
    const dataQuality = parseDataQuality(opportunity.notes);

    // Check minimum match score
    if (matchScore < prefs.minMatchScore) {
      return false;
    }

    // Check if only verified is required
    if (prefs.onlyVerified && dataQuality !== 'verified') {
      return false;
    }

    return true;
  }, [prefs.minMatchScore, prefs.onlyVerified]);

  const handleNewOpportunity = useCallback(async (opportunity: OpportunityPayload) => {
    if (!shouldNotify(opportunity)) return;

    // Mark as processed
    processedIds.current.add(opportunity.id);

    const dataQuality = parseDataQuality(opportunity.notes);
    const matchScore = opportunity.match_score || 0;

    // Send push notification if enabled and permitted
    if (prefs.pushEnabled && permission === 'granted') {
      if (matchScore >= 80 || dataQuality === 'verified') {
        notifyHighMatchOpportunity({
          title: opportunity.position_title,
          company: opportunity.company_name,
          match_score: matchScore,
          data_quality: dataQuality,
          id: opportunity.id,
        });
      } else if (dataQuality === 'verified') {
        notifyVerifiedOpportunity({
          title: opportunity.position_title,
          company: opportunity.company_name,
          location: opportunity.location || undefined,
          id: opportunity.id,
        });
      }
    }

    // Show in-app toast
    const qualityIcon = dataQuality === 'verified' ? '✅' : dataQuality === 'scraped' ? '📊' : '🤖';
    toast.success(
      `${qualityIcon} New opportunity: ${opportunity.position_title} at ${opportunity.company_name}`,
      {
        description: `${matchScore}% match${opportunity.location ? ` • ${opportunity.location}` : ''}`,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = '/app/opportunities';
          },
        },
        duration: 8000,
      }
    );

    // Send email notification for high-priority opportunities
    if (prefs.emailEnabled && userId && (matchScore >= 85 || (matchScore >= 70 && dataQuality === 'verified'))) {
      try {
        await supabase.functions.invoke('send-opportunity-notification', {
          body: {
            user_id: userId,
            opportunities: [{
              id: opportunity.id,
              company_name: opportunity.company_name,
              position_title: opportunity.position_title,
              location: opportunity.location,
              match_score: matchScore,
            }],
            priority: matchScore >= 85 ? 'high' : 'normal',
            is_verified: dataQuality === 'verified',
          },
        });
        console.log('Email notification sent for high-priority opportunity');
      } catch (error) {
        console.log('Email notification skipped:', error);
      }
    }
  }, [userId, prefs.pushEnabled, prefs.emailEnabled, permission, shouldNotify, notifyHighMatchOpportunity, notifyVerifiedOpportunity]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to realtime changes on opportunities table
    const channel = supabase
      .channel(`opportunities-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'opportunities',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New opportunity detected:', payload.new);
          handleNewOpportunity(payload.new as OpportunityPayload);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handleNewOpportunity]);

  // Clear processed IDs periodically to prevent memory bloat
  useEffect(() => {
    const interval = setInterval(() => {
      if (processedIds.current.size > 1000) {
        processedIds.current.clear();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  return {
    processedCount: processedIds.current.size,
  };
};

export default useRealtimeOpportunities;
