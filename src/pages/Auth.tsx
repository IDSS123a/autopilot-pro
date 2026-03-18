import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { lovable } from '@/integrations/lovable/index';
import { Separator } from '@/components/ui/separator';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const urlMode = searchParams.get('mode');
    return urlMode === 'reset' ? 'reset' : 'login';
  });
  const modeRef = useRef(mode);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup, resetPassword, changePassword, isLoading } = useSecureAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        toast({
          title: "Google sign-in failed",
          description: result.error.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Google sign-in failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Check if user is already logged in and handle password reset flow
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Check session and listen for auth events — runs ONCE
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          // If URL says reset, stay on reset form
          if (modeRef.current === 'reset') {
            setCheckingSession(false);
            return;
          }
          navigate('/app', { replace: true });
          return;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        // User clicked recovery link — show reset form, do NOT redirect
        setMode('reset');
        modeRef.current = 'reset';
        setCheckingSession(false);
        return;
      }

      // Only redirect on SIGNED_IN if NOT in reset mode
      // Use ref to avoid stale closure
      if (event === 'SIGNED_IN' && modeRef.current !== 'reset') {
        navigate('/app', { replace: true });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]); // No `mode` dependency — use modeRef instead

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      if (!email || !password) {
        toast({ title: "Missing fields", description: "Please fill in all fields", variant: "destructive" });
        return;
      }
      const result = await login(email, password);
      if (result.success) {
        toast({ title: "Welcome back!", description: "You've successfully logged in" });
        navigate('/app');
      } else {
        toast({ title: "Authentication error", description: result.error, variant: "destructive" });
      }

    } else if (mode === 'signup') {
      if (!email || !password || !fullName) {
        toast({ title: "Missing fields", description: "Please fill in all fields", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same", variant: "destructive" });
        return;
      }
      const result = await signup(email, password, confirmPassword, fullName);
      if (result.success) {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account before signing in.",
        });
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else {
        toast({ title: "Signup error", description: result.error, variant: "destructive" });
      }

    } else if (mode === 'forgot-password') {
      if (!email) {
        toast({ title: "Missing email", description: "Please enter your email address", variant: "destructive" });
        return;
      }
      const result = await resetPassword(email);
      if (result.success) {
        toast({ title: "Reset email sent!", description: "Check your inbox for the password reset link" });
        setMode('login');
      } else {
        toast({ title: "Reset error", description: result.error, variant: "destructive" });
      }

    } else if (mode === 'reset') {
      if (!password || !confirmPassword) {
        toast({ title: "Missing fields", description: "Please fill in both password fields", variant: "destructive" });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same", variant: "destructive" });
        return;
      }
      if (password.length < 6) {
        toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
        return;
      }
      const result = await changePassword(password);
      if (result.success) {
        toast({ title: "Password updated!", description: "Your password has been successfully changed" });
        // After successful reset, navigate to app (user is already signed in via recovery)
        navigate('/app', { replace: true });
      } else {
        if (result.error?.includes('Auth session missing') || result.error?.includes('not logged in')) {
          toast({ title: "Link expired", description: "Your reset link has expired. Please request a new one.", variant: "destructive" });
          setMode('forgot-password');
        } else {
          toast({ title: "Update error", description: result.error, variant: "destructive" });
        }
      }
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
                onClick={() => {
                  setMode('login');
                  setPassword('');
                  setConfirmPassword('');
                }}
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="bg-input border-border pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {(mode === 'signup' || mode === 'reset') && (
                    <p className="text-xs text-muted-foreground">
                      Min 6 characters, must include a letter and a number
                    </p>
                  )}
                </div>
              )}

              {(mode === 'reset' || mode === 'signup') && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {mode === 'reset' ? 'Confirm New Password' : 'Confirm Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="bg-input border-border pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-glow transition-smooth shadow-glow"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getButtonText()}
              </Button>
            </form>

            {(mode === 'login' || mode === 'signup') && (
              <>
                <div className="relative my-6">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    or continue with
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border hover:bg-muted/50 transition-smooth"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || isLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Google
                </Button>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'signup' : 'login');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-sm text-primary hover:text-primary-glow transition-smooth underline-offset-4 hover:underline"
                  >
                    {mode === 'login'
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Sign in'}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
