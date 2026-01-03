import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export type AppRole = 'admin' | 'user';

interface UseUserRoleReturn {
  role: AppRole | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useApp();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // Default to 'user' if no role found
          setRole('user');
        } else {
          setRole(data?.role as AppRole || 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return {
    role,
    isAdmin: role === 'admin',
    isLoading,
  };
};
