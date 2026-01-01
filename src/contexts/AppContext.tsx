import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AppSettings } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface AppContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => Promise<void>;
  appSettings: AppSettings;
  updateAppSettings: (settings: AppSettings) => void;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  website: '',
  targetRole: '',
  industries: '',
  salaryMin: '',
  currency: 'EUR',
  bio: '',
  valueProposition: ''
};

const DEFAULT_SETTINGS: AppSettings = {
  autoApply: false,
  minMatchScore: 85,
  dailyOutreachLimit: 25,
  workingHoursStart: '08:00',
  workingHoursEnd: '19:00',
  humanApprovalRequired: true,
  ghostMode: true,
  salaryBenchmarking: true,
  regions: {
    dach: true,
    see: true,
    uk: false,
    us: false
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to parse ${key} from localStorage`, e);
    return fallback;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [appSettings, setAppSettings] = useState<AppSettings>(() =>
    safeParse<AppSettings>('appSettings_autopilot', DEFAULT_SETTINGS)
  );

  // Load profile from database when user is authenticated
  const loadProfileFromDB = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error loading profile:', error);
        return;
      }
      
      if (profile) {
        const loadedProfile: UserProfile = {
          id: profile.id,
          name: profile.full_name || '',
          title: profile.title || '',
          company: profile.company || '',
          email: profile.email || '',
          phone: profile.phone || '',
          location: profile.location || '',
          linkedin: profile.linkedin_url || '',
          website: profile.website_url || '',
          targetRole: Array.isArray(profile.target_roles) ? profile.target_roles.join(', ') : '',
          industries: Array.isArray(profile.target_industries) ? profile.target_industries.join(', ') : '',
          salaryMin: profile.salary_expectation || '',
          currency: 'EUR',
          bio: profile.bio || '',
          valueProposition: ''
        };
        setUserProfile(loadedProfile);
      }
    } catch (error) {
      console.error('Error in loadProfileFromDB:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Listener FIRST (prevents missed auth events during init)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    // THEN get current session
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load profile after auth state is updated (avoid Supabase calls inside onAuthStateChange)
  useEffect(() => {
    if (!user) {
      setUserProfile(DEFAULT_PROFILE);
      return;
    }

    setTimeout(() => {
      void loadProfileFromDB(user.id);
    }, 0);
  }, [user]);

  const updateUserProfile = async (profile: UserProfile) => {
    // Update local state immediately
    setUserProfile(profile);
    
    if (user) {
      try {
        // Prepare the update data
        const updateData = {
          id: user.id,
          full_name: profile.name,
          title: profile.title,
          company: profile.company,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          linkedin_url: profile.linkedin,
          website_url: profile.website,
          target_roles: profile.targetRole ? profile.targetRole.split(',').map(s => s.trim()).filter(Boolean) : [],
          target_industries: profile.industries ? profile.industries.split(',').map(s => s.trim()).filter(Boolean) : [],
          salary_expectation: profile.salaryMin,
          bio: profile.bio,
          updated_at: new Date().toISOString()
        };

        console.log('Updating profile in DB:', updateData);

        const { error } = await supabase
          .from('profiles')
          .upsert(updateData, { onConflict: 'id' });

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
        
        console.log('Profile saved successfully to database');
      } catch (error) {
        console.error('Failed to save profile to database:', error);
        throw error;
      }
    }
  };

  const updateAppSettings = (settings: AppSettings) => {
    setAppSettings(settings);
    localStorage.setItem('appSettings_autopilot', JSON.stringify(settings));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserProfile(DEFAULT_PROFILE);
  };

  return (
    <AppContext.Provider value={{
      session,
      user,
      userProfile,
      updateUserProfile,
      appSettings,
      updateAppSettings,
      isLoading,
      signOut
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};