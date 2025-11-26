import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  LayoutDashboard, 
  FileText, 
  Target, 
  Users, 
  MessageSquare, 
  Search, 
  Settings,
  LogOut,
  Loader2,
  Briefcase
} from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);
      
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setProfile(profileData);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate('/auth');
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } else {
      navigate('/auth');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold">C-Level AutoPilot Pro</h1>
              <p className="text-xs text-muted-foreground">Executive Career Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{profile?.title || 'Executive'}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              className="border-border hover:bg-destructive hover:border-destructive transition-smooth"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-heading font-bold mb-2">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Executive'}!
          </h2>
          <p className="text-muted-foreground">
            Your AI-powered job search command center
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          <Card className="p-6 border-border/50 hover:border-primary/50 transition-smooth cursor-pointer group bg-card/80 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                <LayoutDashboard className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading font-semibold mb-1">Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Overview of your job search progress and metrics
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 hover:border-primary/50 transition-smooth cursor-pointer group bg-card/80 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading font-semibold mb-1">CV Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered CV analysis and optimization
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 hover:border-primary/50 transition-smooth cursor-pointer group bg-card/80 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading font-semibold mb-1">Opportunities</h3>
                <p className="text-sm text-muted-foreground">
                  Discover and track executive opportunities
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 hover:border-primary/50 transition-smooth cursor-pointer group bg-card/80 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading font-semibold mb-1">Recruiters</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with top executive recruiters
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 hover:border-primary/50 transition-smooth cursor-pointer group bg-card/80 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading font-semibold mb-1">Communication</h3>
                <p className="text-sm text-muted-foreground">
                  Track and manage all your communications
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 hover:border-primary/50 transition-smooth cursor-pointer group bg-card/80 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-heading font-semibold mb-1">Due Diligence</h3>
                <p className="text-sm text-muted-foreground">
                  Research companies and prepare for interviews
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Applications</p>
            <p className="text-2xl font-heading font-bold text-primary">0</p>
          </Card>
          <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Interviews</p>
            <p className="text-2xl font-heading font-bold text-accent">0</p>
          </Card>
          <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Recruiters</p>
            <p className="text-2xl font-heading font-bold text-success">0</p>
          </Card>
          <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Opportunities</p>
            <p className="text-2xl font-heading font-bold text-primary-glow">0</p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
