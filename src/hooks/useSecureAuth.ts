import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuthEvent } from '@/hooks/useAuthAudit';
import { 
  loginSchema, 
  signupSchema, 
  passwordResetSchema, 
  validateInput,
  checkRateLimit 
} from '@/lib/validation';

interface AuthResult {
  success: boolean;
  error?: string;
}

export function useSecureAuth() {
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    // Rate limiting
    if (!checkRateLimit(`login:${email}`, 5, 60000)) {
      return { success: false, error: 'Too many login attempts. Please wait.' };
    }

    // Validate input
    const validation = validateInput(loginSchema, { email, password });
    if (!validation.success) {
      return { success: false, error: (validation as { success: false; errors: string[] }).errors[0] };
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        // Don't reveal if email exists
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        logAuthEvent('login', data.user.id).catch(console.error);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (
    email: string, 
    password: string, 
    confirmPassword: string,
    name?: string
  ): Promise<AuthResult> => {
    // Rate limiting
    if (!checkRateLimit('signup', 3, 60000)) {
      return { success: false, error: 'Too many signup attempts. Please wait.' };
    }

    // Validate input
    const validation = validateInput(signupSchema, { email, password, confirmPassword, name });
    if (!validation.success) {
      return { success: false, error: (validation as { success: false; errors: string[] }).errors[0] };
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'An account with this email already exists' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        logAuthEvent('signup', data.user.id).catch(console.error);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Signup failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    // Rate limiting
    if (!checkRateLimit(`reset:${email}`, 2, 60000)) {
      return { success: false, error: 'Too many reset attempts. Please wait.' };
    }

    // Validate input
    const validation = validateInput(passwordResetSchema, { email });
    if (!validation.success) {
      return { success: false, error: (validation as { success: false; errors: string[] }).errors[0] };
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(validation.data.email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Always return success to prevent email enumeration
      return { success: true };
    } catch {
      return { success: true }; // Still return success
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    // Rate limiting
    if (!checkRateLimit('changePassword', 3, 60000)) {
      return { success: false, error: 'Too many attempts. Please wait.' };
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        logAuthEvent('password_update', user.id).catch(console.error);
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Password change failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    signup,
    resetPassword,
    changePassword,
    isLoading,
  };
}
