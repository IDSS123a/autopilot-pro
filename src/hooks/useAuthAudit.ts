import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type AuditEventType = 'login' | 'logout' | 'signup' | 'password_reset' | 'password_update';

export const logAuthEvent = async (
  eventType: AuditEventType,
  userId: string,
  metadata?: Record<string, unknown>
) => {
  try {
    const { error } = await supabase
      .from('auth_audit_log')
      .insert([{
        user_id: userId,
        event_type: eventType,
        user_agent: navigator.userAgent,
        metadata: (metadata || {}) as Json
      }]);
    
    if (error) {
      console.error('Failed to log auth event:', error);
    }
  } catch (err) {
    console.error('Auth audit log error:', err);
  }
};

export const useAuthAudit = () => {
  return { logAuthEvent };
};
