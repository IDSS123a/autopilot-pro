import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AppSettings } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AppContextType {
  user: User | null;
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
  appSettings: AppSettings;
  updateAppSettings: (settings: AppSettings) => void;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'John Doe',
  title: 'Chief Technology Officer',
  company: 'FinTech Global',
  email: 'john.doe@executive.com',
  phone: '+41 79 123 4567',
  location: 'Zurich, Switzerland',
  linkedin: 'linkedin.com/in/johndoe-cto',
  website: 'johndoe.tech',
  targetRole: 'CTO / VP Engineering / CIO',
  industries: 'FinTech, InsurTech, SaaS',
  salaryMin: '220,000',
  currency: 'CHF',
  bio: 'Visionary technology leader with 15+ years of experience in FinTech and Digital Transformation.',
  valueProposition: 'I bridge the gap between complex technical strategy and business ROI, specializing in AI implementation and legacy modernization.'
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => 
    safeParse<UserProfile>('userProfile_autopilot', DEFAULT_PROFILE)
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(() => 
    safeParse<AppSettings>('appSettings_autopilot', DEFAULT_SETTINGS)
  );

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch profile from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUserProfile({
            id: profile.id,
            name: profile.full_name || DEFAULT_PROFILE.name,
            title: profile.title || DEFAULT_PROFILE.title,
            company: profile.company || DEFAULT_PROFILE.company,
            email: profile.email || session.user.email || DEFAULT_PROFILE.email,
            phone: profile.phone || DEFAULT_PROFILE.phone,
            location: profile.location || DEFAULT_PROFILE.location,
            linkedin: profile.linkedin_url || DEFAULT_PROFILE.linkedin,
            website: profile.website_url || DEFAULT_PROFILE.website,
            targetRole: profile.target_roles?.join(', ') || DEFAULT_PROFILE.targetRole,
            industries: profile.target_industries?.join(', ') || DEFAULT_PROFILE.industries,
            salaryMin: profile.salary_expectation || DEFAULT_PROFILE.salaryMin,
            currency: 'CHF',
            bio: profile.bio || DEFAULT_PROFILE.bio,
            valueProposition: DEFAULT_PROFILE.valueProposition
          });
        }
      }
      
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUserProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('userProfile_autopilot', JSON.stringify(profile));
    
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.name,
        title: profile.title,
        company: profile.company,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin_url: profile.linkedin,
        website_url: profile.website,
        target_roles: profile.targetRole.split(',').map(s => s.trim()),
        target_industries: profile.industries.split(',').map(s => s.trim()),
        salary_expectation: profile.salaryMin,
        bio: profile.bio
      });
    }
  };

  const updateAppSettings = (settings: AppSettings) => {
    setAppSettings(settings);
    localStorage.setItem('appSettings_autopilot', JSON.stringify(settings));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AppContext.Provider value={{
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
