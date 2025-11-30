import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Briefcase, Target, Users, Zap, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/app');
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl mb-8 shadow-glow animate-glow">
            <Briefcase className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-heading font-bold mb-6 bg-clip-text text-transparent bg-gradient-accent">
            C-Level AutoPilot Pro
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/90 mb-4">
            AI-Driven Executive Job Search Platform
          </p>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Automate your executive job search with intelligent CV analysis, recruiter discovery, 
            and opportunity mining powered by advanced AI.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary-glow transition-smooth shadow-glow text-lg px-8 group"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="border-border hover:bg-card transition-smooth text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto animate-slide-up">
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-smooth">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Smart Opportunity Discovery</h3>
            <p className="text-muted-foreground">
              AI-powered job matching analyzes thousands of executive positions to find perfect opportunities for your career goals.
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-smooth">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Recruiter Network</h3>
            <p className="text-muted-foreground">
              Connect with top executive recruiters who specialize in C-level placements across industries.
            </p>
          </div>

          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-smooth">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold mb-3">Automated Outreach</h3>
            <p className="text-muted-foreground">
              Intelligent communication tools help you engage with recruiters and hiring managers effectively.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
