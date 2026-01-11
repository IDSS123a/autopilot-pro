import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

const SESSION_KEY = 'app_session_id';

const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const getSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

const getPageTitle = (pathname: string): string => {
  const titles: Record<string, string> = {
    '/app': 'Dashboard',
    '/app/opportunities': 'Opportunity Scanner',
    '/app/cv-analyzer': 'CV Analyzer',
    '/app/due-diligence': 'Due Diligence',
    '/app/recruiter-agent': 'Recruiter Agent',
    '/app/communication': 'Communication Hub',
    '/app/settings': 'Settings',
    '/app/admin': 'Admin Dashboard',
  };
  return titles[pathname] || pathname;
};

export const useSessionTracker = () => {
  const { user } = useApp();
  const location = useLocation();
  const lastPathRef = useRef<string>('');
  const sessionInitializedRef = useRef(false);

  // Initialize or update session
  useEffect(() => {
    if (!user) return;

    const sessionId = getSessionId();
    
    const initSession = async () => {
      if (sessionInitializedRef.current) {
        // Just update last activity
        await supabase
          .from('user_sessions')
          .update({ 
            last_activity_at: new Date().toISOString(),
            pages_visited: supabase.rpc ? undefined : 1 // Will increment via page views
          })
          .eq('session_id', sessionId);
        return;
      }

      try {
        // Try to upsert session
        const { error } = await supabase
          .from('user_sessions')
          .upsert({
            user_id: user.id,
            session_id: sessionId,
            started_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
            pages_visited: 1
          }, { onConflict: 'session_id' });

        if (!error) {
          sessionInitializedRef.current = true;
        }
      } catch (err) {
        console.error('Error initializing session:', err);
      }
    };

    initSession();
  }, [user]);

  // Track page views
  useEffect(() => {
    if (!user || location.pathname === lastPathRef.current) return;
    
    lastPathRef.current = location.pathname;
    const sessionId = getSessionId();

    const trackPageView = async () => {
      try {
        // Insert page view
        await supabase.from('page_views').insert({
          user_id: user.id,
          page_path: location.pathname,
          page_title: getPageTitle(location.pathname),
          session_id: sessionId
        });

        // Update session last activity and page count
        await supabase
          .from('user_sessions')
          .update({ 
            last_activity_at: new Date().toISOString()
          })
          .eq('session_id', sessionId);

      } catch (err) {
        console.error('Error tracking page view:', err);
      }
    };

    trackPageView();
  }, [user, location.pathname]);

  // Handle page unload - mark session as ended
  useEffect(() => {
    if (!user) return;

    const handleUnload = () => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (sessionId) {
        // Use sendBeacon for reliability on page unload
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?session_id=eq.${sessionId}`,
          JSON.stringify({ ended_at: new Date().toISOString() })
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);
};
