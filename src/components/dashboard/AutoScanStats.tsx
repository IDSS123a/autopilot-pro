import React, { useEffect, useState } from 'react';
import { Radar, Clock, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

interface AutoScanData {
  lastScanAt: string | null;
  newLast24h: number;
  avgMatchScore: number;
  totalAutoSaved: number;
}

const AutoScanStats: React.FC = () => {
  const { user } = useApp();
  const [data, setData] = useState<AutoScanData>({
    lastScanAt: null, newLast24h: 0, avgMatchScore: 0, totalAutoSaved: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadStats();
  }, [user?.id]);

  const loadStats = async () => {
    try {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Get auto-saved opportunities (notes contains "auto_scan" or "auto_saved")
      const { data: allAuto, error } = await supabase
        .from('opportunities')
        .select('match_score, created_at, notes')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const autoSaved = (allAuto || []).filter(o => {
        try {
          const n = JSON.parse(o.notes || '{}');
          return n.auto_saved || n.auto_scan;
        } catch { return false; }
      });

      const last24h = autoSaved.filter(o => o.created_at >= h24);
      const scores = autoSaved.map(o => o.match_score || 0).filter(s => s > 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      setData({
        lastScanAt: autoSaved.length > 0 ? autoSaved[0].created_at : null,
        newLast24h: last24h.length,
        avgMatchScore: avg,
        totalAutoSaved: autoSaved.length,
      });
    } catch (e) {
      console.error('Error loading auto-scan stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Less than 1h ago';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const nextScanIn = () => {
    if (!data.lastScanAt) return 'Pending...';
    const lastScan = new Date(data.lastScanAt).getTime();
    const nextScan = lastScan + 6 * 60 * 60 * 1000;
    const diff = nextScan - Date.now();
    if (diff <= 0) return 'Running soon...';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const metrics = [
    { icon: Clock, label: 'Last Scan', value: formatTimeAgo(data.lastScanAt), color: 'text-primary' },
    { icon: TrendingUp, label: 'New (24h)', value: String(data.newLast24h), color: 'text-success' },
    { icon: BarChart3, label: 'Avg Match', value: data.avgMatchScore > 0 ? `${data.avgMatchScore}%` : '—', color: 'text-accent' },
    { icon: Radar, label: 'Total Auto-Saved', value: String(data.totalAutoSaved), color: 'text-primary-glow' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Auto-Scan Status</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 border border-success/30 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-success">Every 6h</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, i) => (
          <div key={i} className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
            <p className={`text-lg font-heading font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Next scan in</span>
        <span className="text-xs font-medium text-foreground">{nextScanIn()}</span>
      </div>
    </div>
  );
};

export default AutoScanStats;
