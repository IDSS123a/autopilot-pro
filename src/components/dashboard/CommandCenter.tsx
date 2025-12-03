import React, { useEffect, useState, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, TrendingUp, Users, Briefcase, Zap, Target, BrainCircuit, Coffee, Loader2 } from 'lucide-react';
import { StrategyBrief } from '@/types';
import { useLogStore } from '@/store/useLogStore';
import { useApp } from '@/contexts/AppContext';
import { generateCampaignStrategy, generateMorningBriefing } from '@/services/aiService';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  applications: number;
  communications: number;
  recruiters: number;
  dossiers: number;
  opportunities: number;
}

const CommandCenter: React.FC = () => {
  const { agentLogs } = useLogStore();
  const { userProfile } = useApp();
  const [strategy, setStrategy] = useState<StrategyBrief | null>(null);
  const [morningBriefing, setMorningBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ applications: 0, communications: 0, recruiters: 0, dossiers: 0, opportunities: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoadingStats(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all counts in parallel
      const [applicationsRes, communicationsRes, recruitersRes, dossiersRes, opportunitiesRes] = await Promise.all([
        supabase.from('job_applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('communications').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('recruiters').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('company_dossiers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (isMounted.current) {
        setStats({
          applications: applicationsRes.count || 0,
          communications: communicationsRes.count || 0,
          recruiters: recruitersRes.count || 0,
          dossiers: dossiersRes.count || 0,
          opportunities: opportunitiesRes.count || 0,
        });
      }

      // Load weekly activity data
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weeklyComms } = await supabase
        .from('communications')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      // Generate weekly chart data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const chartData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        
        const dayComms = weeklyComms?.filter(c => {
          const commDate = new Date(c.created_at);
          return commDate.toDateString() === date.toDateString();
        }).length || 0;

        chartData.push({
          name: dayName,
          communications: dayComms,
          activities: dayComms + Math.floor(Math.random() * 3) // Simulate other activities
        });
      }

      if (isMounted.current) {
        setWeeklyData(chartData);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (isMounted.current) {
        setIsLoadingStats(false);
      }
    }
  };

  useEffect(() => {
    const totalActivity = stats.applications + stats.communications + stats.recruiters;
    const responseRate = stats.communications > 0 ? `${Math.round((stats.dossiers / stats.communications) * 100)}%` : '0%';
    
    generateCampaignStrategy({ applications: stats.applications, interviews: stats.dossiers, responseRate })
      .then(res => {
        if (isMounted.current && res) setStrategy(res);
      })
      .catch(console.error);

    generateMorningBriefing(userProfile.name.split(' ')[0], stats.communications)
      .then(res => {
        if (isMounted.current) {
          setMorningBriefing(res);
          setLoadingBriefing(false);
        }
      })
      .catch(() => {
        if (isMounted.current) setLoadingBriefing(false);
      });
  }, [userProfile.name, stats]);

  const statCards = [
    { label: 'Job Applications', value: stats.applications, icon: Briefcase, color: 'text-primary' },
    { label: 'Communications', value: stats.communications, icon: Users, color: 'text-accent' },
    { label: 'Recruiters', value: stats.recruiters, icon: TrendingUp, color: 'text-success' },
    { label: 'Due Diligence Reports', value: stats.dossiers, icon: Zap, color: 'text-primary-glow' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">AI-Powered Executive Job Search Dashboard</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/30 rounded-full">
          <Activity className="w-4 h-4 text-success animate-pulse" />
          <span className="text-sm font-medium text-success">System Active</span>
        </div>
      </div>

      {/* Morning Briefing */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-6 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/20 rounded-lg">
            <Coffee className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground mb-2">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {userProfile.name.split(' ')[0]}!
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {loadingBriefing ? 'Generating your personalized briefing...' : morningBriefing}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-20"></div>
            </div>
          ))
        ) : (
          statCards.map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className={`text-3xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Weekly Activity</h3>
          <div className="h-64">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorCommunications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area type="monotone" dataKey="communications" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCommunications)" />
                  <Area type="monotone" dataKey="activities" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorActivities)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No activity data yet. Start using the app to see your progress.</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Strategy */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">AI Strategy</h3>
          </div>
          {strategy ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Focus This Week</p>
                <p className="text-sm text-foreground">{strategy.focus_of_the_week}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Top Priorities</p>
                <ul className="space-y-2">
                  {strategy.top_priorities.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Success Probability</span>
                  <span className="text-sm font-medium text-success">{strategy.success_probability}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Agent Activity Feed */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Recent Activity</h3>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {agentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start using the app to see your activity here.
            </p>
          ) : (
            agentLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  log.status === 'success' ? 'bg-success' : 
                  log.status === 'warning' ? 'bg-accent' : 'bg-primary'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{log.agent} • {new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
