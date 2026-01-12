import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserCog, 
  UserPlus, 
  Clock, 
  Eye, 
  TrendingUp,
  RefreshCw,
  Calendar,
  MapPin,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, formatDistanceToNow, startOfMonth, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface UserSession {
  id: string;
  user_id: string;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  pages_visited: number;
  user_agent: string | null;
}

interface PageViewStat {
  page_path: string;
  page_title: string | null;
  count: number;
}

interface DailyActivity {
  date: string;
  displayDate: string;
  sessions: number;
  pageViews: number;
  uniqueUsers: number;
}

interface UserActivity {
  userId: string;
  name: string;
  email: string;
  lastSeen: string;
  totalSessions: number;
  avgDuration: number;
  topPages: string[];
}

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "hsl(var(--primary))",
  },
  pageViews: {
    label: "Page Views",
    color: "hsl(var(--chart-2))",
  },
  uniqueUsers: {
    label: "Unique Users",
    color: "hsl(var(--chart-3))",
  },
};

const UserStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    newThisMonth: 0,
    activeToday: 0,
    avgSessionDuration: 0,
    totalPageViews: 0
  });
  const [recentUsers, setRecentUsers] = useState<UserActivity[]>([]);
  const [topPages, setTopPages] = useState<PageViewStat[]>([]);
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const startOfThisMonth = startOfMonth(new Date()).toISOString();
      const today = subDays(new Date(), 1).toISOString();

      // Date range for last 14 days chart
      const fourteenDaysAgo = subDays(new Date(), 14);

      // Parallel fetch all stats
      const [
        { count: userCount },
        { count: adminCount },
        { count: newCount },
        { data: sessions },
        { data: pageViews },
        { data: profiles },
        { data: allSessions },
        { data: allPageViews }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfThisMonth),
        supabase.from('user_sessions').select('*').order('last_activity_at', { ascending: false }).limit(100),
        supabase.from('page_views').select('page_path, page_title, session_id, user_id').order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }),
        supabase.from('user_sessions').select('started_at, user_id').gte('started_at', fourteenDaysAgo.toISOString()),
        supabase.from('page_views').select('created_at, user_id').gte('created_at', fourteenDaysAgo.toISOString())
      ]);

      // Calculate active today (sessions with activity in last 24h)
      const activeToday = sessions?.filter(s => 
        new Date(s.last_activity_at) > new Date(today)
      ).length || 0;

      // Calculate average session duration
      const completedSessions = sessions?.filter(s => s.ended_at) || [];
      const avgDuration = completedSessions.length > 0
        ? completedSessions.reduce((acc, s) => {
            const duration = new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime();
            return acc + duration;
          }, 0) / completedSessions.length / 60000 // Convert to minutes
        : 0;

      setStats({
        totalUsers: userCount || 0,
        totalAdmins: adminCount || 0,
        newThisMonth: newCount || 0,
        activeToday,
        avgSessionDuration: Math.round(avgDuration),
        totalPageViews: pageViews?.length || 0
      });

      // Set active sessions (last activity within 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      setActiveSessions(
        sessions?.filter(s => new Date(s.last_activity_at) > fifteenMinutesAgo) || []
      );

      // Calculate top pages
      const pageCounts: Record<string, { path: string; title: string | null; count: number }> = {};
      pageViews?.forEach(pv => {
        if (!pageCounts[pv.page_path]) {
          pageCounts[pv.page_path] = { path: pv.page_path, title: pv.page_title, count: 0 };
        }
        pageCounts[pv.page_path].count++;
      });
      setTopPages(
        Object.values(pageCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(p => ({ page_path: p.path, page_title: p.title, count: p.count }))
      );

      // Build user activity data from page views directly
      const userPageData: Record<string, string[]> = {};
      const userSessionCount: Record<string, Set<string>> = {};
      
      pageViews?.forEach(pv => {
        if (!userPageData[pv.user_id]) {
          userPageData[pv.user_id] = [];
          userSessionCount[pv.user_id] = new Set();
        }
        if (pv.session_id) {
          userSessionCount[pv.user_id].add(pv.session_id);
        }
        const pageLabel = pv.page_title || pv.page_path;
        if (!userPageData[pv.user_id].includes(pageLabel)) {
          userPageData[pv.user_id].push(pageLabel);
        }
      });

      const recentActivity: UserActivity[] = (profiles || []).slice(0, 10).map(p => {
        const userSessions = sessions?.filter(s => s.user_id === p.id) || [];
        const lastSession = userSessions[0];
        const completedSessions = userSessions.filter(s => s.ended_at);
        const avgDur = completedSessions.length > 0
          ? completedSessions.reduce((acc, s) => {
              return acc + (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime());
            }, 0) / completedSessions.length / 60000
          : 0;

        return {
          userId: p.id,
          name: p.full_name || 'Unknown',
          email: p.email,
          lastSeen: lastSession?.last_activity_at || p.created_at,
          totalSessions: userSessionCount[p.id]?.size || userSessions.length || 0,
          avgDuration: Math.round(avgDur || 0),
          topPages: userPageData[p.id]?.slice(0, 3) || []
        };
      });

      setRecentUsers(recentActivity);

      // Calculate daily activity for chart (last 14 days)
      const days = eachDayOfInterval({
        start: fourteenDaysAgo,
        end: new Date()
      });

      const dailyData: DailyActivity[] = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const daySessions = allSessions?.filter(s => {
          const sessionDate = new Date(s.started_at);
          return sessionDate >= dayStart && sessionDate < dayEnd;
        }) || [];
        
        const dayPageViews = allPageViews?.filter(pv => {
          const pvDate = new Date(pv.created_at);
          return pvDate >= dayStart && pvDate < dayEnd;
        }) || [];
        
        const uniqueUserIds = new Set([
          ...daySessions.map(s => s.user_id),
          ...dayPageViews.map(pv => pv.user_id)
        ]);

        return {
          date: day.toISOString(),
          displayDate: format(day, 'MMM d'),
          sessions: daySessions.length,
          pageViews: dayPageViews.length,
          uniqueUsers: uniqueUserIds.size
        };
      });

      setDailyActivity(dailyData);

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 30 seconds for real-time feel
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <UserCog className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : stats.totalAdmins}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserPlus className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : stats.newThisMonth}</p>
                <p className="text-xs text-muted-foreground">New This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : stats.activeToday}</p>
                <p className="text-xs text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : formatDuration(stats.avgSessionDuration)}</p>
                <p className="text-xs text-muted-foreground">Avg Session</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Eye className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '...' : stats.totalPageViews}</p>
                <p className="text-xs text-muted-foreground">Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            User Activity (Last 14 Days)
          </CardTitle>
          <CardDescription>Sessions, page views, and unique users over time</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No activity data available yet</p>
          ) : (
            <ChartContainer config={chartConfig} className="w-full" style={{ minHeight: '300px', height: '300px' }}>
              <LineChart
                data={dailyActivity}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                width={500}
                height={300}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="displayDate" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="var(--color-sessions)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pageViews" 
                  stroke="var(--color-pageViews)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="uniqueUsers" 
                  stroke="var(--color-uniqueUsers)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          )}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
              <span className="text-sm text-muted-foreground">Page Views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
              <span className="text-sm text-muted-foreground">Unique Users</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently Active Users */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Active Now
                </CardTitle>
                <CardDescription>Users online in last 15 minutes</CardDescription>
              </div>
              <Button onClick={fetchStats} disabled={loading} variant="ghost" size="sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeSessions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No active users right now</p>
            ) : (
              <div className="space-y-3">
                {activeSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{session.user_id.slice(0, 8)}...</p>
                        <p className="text-xs text-muted-foreground">
                          Active {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {session.pages_visited} pages
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Pages */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Popular Pages
            </CardTitle>
            <CardDescription>Most visited sections of the app</CardDescription>
          </CardHeader>
          <CardContent>
            {topPages.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No page views recorded yet</p>
            ) : (
              <div className="space-y-3">
                {topPages.map((page, index) => {
                  const maxCount = topPages[0]?.count || 1;
                  const percentage = (page.count / maxCount) * 100;
                  return (
                    <div key={page.page_path} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{page.page_title || page.page_path}</span>
                        <span className="text-xs text-muted-foreground">{page.count} views</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent User Activity Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            User Activity Overview
          </CardTitle>
          <CardDescription>When users connected and what they explored</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No user activity recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Last Seen</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Sessions</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Avg Duration</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Interests</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.userId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{user.totalSessions}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm">{formatDuration(user.avgDuration)}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 flex-wrap">
                          {user.topPages.length > 0 ? (
                            user.topPages.map((page, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {page}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No activity</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStats;
