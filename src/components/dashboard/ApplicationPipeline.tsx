import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Send, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  Building2,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Application {
  id: string;
  company_name: string;
  position_title: string;
  status: string;
  application_date: string;
  location?: string;
}

const statusConfig = {
  applied: { label: 'Applied', icon: Send, color: 'bg-blue-500', textColor: 'text-blue-500' },
  screening: { label: 'Screening', icon: Phone, color: 'bg-amber-500', textColor: 'text-amber-500' },
  interviewing: { label: 'Interviewing', icon: Clock, color: 'bg-purple-500', textColor: 'text-purple-500' },
  offer: { label: 'Offer', icon: CheckCircle2, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-500', textColor: 'text-red-500' },
  withdrawn: { label: 'Withdrawn', icon: XCircle, color: 'bg-slate-500', textColor: 'text-slate-500' },
};

export function ApplicationPipeline() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('application_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = {
      applied: 0,
      screening: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };
    
    applications.forEach(app => {
      const status = app.status?.toLowerCase() || 'applied';
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    
    return counts;
  };

  const statusCounts = getStatusCounts();
  const totalActive = statusCounts.applied + statusCounts.screening + statusCounts.interviewing;
  const successRate = applications.length > 0 
    ? Math.round((statusCounts.offer / applications.length) * 100) 
    : 0;

  const pipelineStages = [
    { key: 'applied', ...statusConfig.applied, count: statusCounts.applied },
    { key: 'screening', ...statusConfig.screening, count: statusCounts.screening },
    { key: 'interviewing', ...statusConfig.interviewing, count: statusCounts.interviewing },
    { key: 'offer', ...statusConfig.offer, count: statusCounts.offer },
  ];

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Application Pipeline
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/opportunities')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pipeline Visual */}
        <div className="flex items-center justify-between gap-2">
          {pipelineStages.map((stage, index) => (
            <div key={stage.key} className="flex-1 relative">
              <div className={cn(
                "flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                stage.count > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
              )}>
                <stage.icon className={cn("h-5 w-5 mb-1", stage.textColor)} />
                <span className="text-2xl font-bold">{stage.count}</span>
                <span className="text-xs text-muted-foreground">{stage.label}</span>
              </div>
              {index < pipelineStages.length - 1 && (
                <ArrowRight className="absolute right-[-14px] top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              )}
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{applications.length}</p>
            <p className="text-xs text-muted-foreground">Total Applications</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-primary">{totalActive}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <p className="text-2xl font-bold text-emerald-500">{successRate}%</p>
            </div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Pipeline Progress</span>
            <span className="text-muted-foreground">{totalActive} active of {applications.length} total</span>
          </div>
          <Progress 
            value={applications.length > 0 ? (totalActive / applications.length) * 100 : 0} 
            className="h-2"
          />
        </div>

        {/* Recent Applications */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Recent Applications</p>
          <ScrollArea className="h-[200px]">
            {applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No applications yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/app/opportunities')}
                >
                  Find Opportunities
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {applications.slice(0, 10).map((app) => {
                  const status = app.status?.toLowerCase() || 'applied';
                  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.applied;
                  
                  return (
                    <div 
                      key={app.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-2 h-8 rounded-full", config.color)} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {app.position_title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{app.company_name}</span>
                            {app.application_date && (
                              <>
                                <span>•</span>
                                <span>{format(new Date(app.application_date), 'MMM d')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("shrink-0 ml-2", config.textColor)}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
