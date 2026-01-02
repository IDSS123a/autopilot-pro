import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Loader2, ArrowLeft } from 'lucide-react';
import { logAuthEvent } from '@/hooks/useAuthAudit';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const urlMode = searchParams.get('mode');
    return urlMode === 'reset' ? 'reset' : 'login';
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in and handle password reset flow
  useEffect(() => {
    let isMounted = true;

    // First check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          // If we're in reset mode, stay on page to allow password change
          if (mode === 'reset') {
            setCheckingSession(false);
            return;
          }
          navigate('/app', { replace: true });
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      // Handle password recovery event
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setCheckingSession(false);
        return;
      }
      
      // Don't redirect if we're in reset mode
      if (mode === 'reset') {
        return;
      }
      
      if (session) {
        navigate('/app', { replace: true });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Missing email",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    if (mode !== 'forgot-password' && !password) {
      toast({
        title: "Missing password",
        description: "Please enter your password",
        variant: "destructive"
      });
      return;
    }

    if (mode === 'signup' && !fullName) {
      toast({
        title: "Missing name",
        description: "Please enter your full name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Log successful login
        if (data.user) {
          await logAuthEvent('login', data.user.id, { email });
        }

        toast({
          title: "Welcome back!",
          description: "You've successfully logged in",
        });
        navigate('/app');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });

        if (error) throw error;

        // Log successful signup
        if (data.user) {
          await logAuthEvent('signup', data.user.id, { email, fullName });
        }

        toast({
          title: "Account created!",
          description: "Welcome to C-Level AutoPilot Pro",
        });
        navigate('/app');
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });

        if (error) throw error;

        toast({
          title: "Reset email sent!",
          description: "Check your inbox for the password reset link",
        });
        setMode('login');
      } else if (mode === 'reset') {
        // Validate passwords match
        if (password !== confirmPassword) {
          toast({
            title: "Passwords don't match",
            description: "Please make sure both passwords are the same",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast({
            title: "Password too short",
            description: "Password must be at least 6 characters",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.updateUser({
          password: password,
        });

        if (error) throw error;

        // Log password update
        if (data.user) {
          await logAuthEvent('password_update', data.user.id);
        }

        toast({
          title: "Password updated!",
          description: "Your password has been successfully changed",
        });
        navigate('/app');
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      // User-friendly error messages
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address first.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists.';
      } else if (error.message?.includes('Auth session missing')) {
        errorMessage = 'Your reset link has expired. Please request a new one.';
        setMode('forgot-password');
      }
      
      toast({
        title: "Authentication error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Get Started';
      case 'forgot-password': return 'Reset Password';
      case 'reset': return 'Set New Password';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Sign in to access your job search dashboard';
      case 'signup': return 'Create your account to start your executive career journey';
      case 'forgot-password': return 'Enter your email and we\'ll send you a reset link';
      case 'reset': return 'Enter your new password below';
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case 'login': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Send Reset Link';
      case 'reset': return 'Update Password';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-glow">
            <Briefcase className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            C-Level AutoPilot Pro
          </h1>
          <p className="text-muted-foreground">
            AI-Powered Executive Job Search Platform
          </p>
        </div>

        <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
          <CardHeader>
            {(mode === 'forgot-password' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-smooth"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
            )}
            <CardTitle className="text-2xl font-heading">
              {getTitle()}
            </CardTitle>
            <CardDescription>
              {getDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={mode === 'signup'}
                    className="bg-input border-border"
                  />
                </div>
              )}

              {mode !== 'reset' && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-input border-border"
                  />
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">
                      {mode === 'reset' ? 'New Password' : 'Password'}
                    </Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-xs text-primary hover:text-primary-glow transition-smooth"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-input border-border"
                  />
                </div>
              )}

              {mode === 'reset' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-input border-border"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-glow transition-smooth shadow-glow"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getButtonText()}
              </Button>
            </form>

            {(mode === 'login' || mode === 'signup') && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-sm text-primary hover:text-primary-glow transition-smooth underline-offset-4 hover:underline"
                >
                  {mode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;