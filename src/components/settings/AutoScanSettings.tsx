import React, { useState, useEffect } from 'react';
import { Radar, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const WORLD_REGIONS = [
  { id: 'see', name: 'SEE (Southeast Europe)' },
  { id: 'dach', name: 'DACH (Germany, Austria, Switzerland)' },
  { id: 'nordics', name: 'Nordics' },
  { id: 'benelux', name: 'Benelux' },
  { id: 'uk_ireland', name: 'UK & Ireland' },
  { id: 'france', name: 'France' },
  { id: 'iberia', name: 'Iberia' },
  { id: 'italy', name: 'Italy' },
  { id: 'eastern_europe', name: 'Eastern Europe' },
  { id: 'middle_east', name: 'Middle East' },
  { id: 'north_america', name: 'North America' },
  { id: 'asia', name: 'Asia' },
  { id: 'oceania', name: 'Oceania' },
  { id: 'africa', name: 'Africa' },
  { id: 'latam', name: 'Latin America' },
];

interface AutoScanConfig {
  enabled: boolean;
  frequency: '3h' | '6h' | '12h' | '24h';
  minMatchScore: number;
  maxResultsPerScan: number;
  preferredRegions: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const DEFAULT_CONFIG: AutoScanConfig = {
  enabled: true,
  frequency: '6h',
  minMatchScore: 70,
  maxResultsPerScan: 50,
  preferredRegions: ['see', 'dach'],
  emailNotifications: true,
  pushNotifications: true,
};

const FREQUENCY_OPTIONS = [
  { value: '3h', label: 'Every 3 hours' },
  { value: '6h', label: 'Every 6 hours' },
  { value: '12h', label: 'Every 12 hours' },
  { value: '24h', label: 'Every 24 hours' },
];

const AutoScanSettings: React.FC = () => {
  const [config, setConfig] = useState<AutoScanConfig>(() => {
    try {
      const saved = localStorage.getItem('auto_scan_config');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('auto_scan_config', JSON.stringify(config));
      toast.success('Auto-scan settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRegion = (regionId: string) => {
    setConfig(prev => ({
      ...prev,
      preferredRegions: prev.preferredRegions.includes(regionId)
        ? prev.preferredRegions.filter(r => r !== regionId)
        : [...prev.preferredRegions, regionId]
    }));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-foreground">Auto-Scan Configuration</h2>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save
        </Button>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-foreground font-medium">Enable Auto-Scan</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically scan for new opportunities on a schedule</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig(prev => ({ ...prev, enabled: v }))} />
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Scan Frequency</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {FREQUENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setConfig(prev => ({ ...prev, frequency: opt.value as AutoScanConfig['frequency'] }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  config.frequency === opt.value
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min Match Score */}
        <div className="space-y-2">
          <Label htmlFor="minScore" className="text-foreground font-medium">
            Minimum Match Score for Auto-Save
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="minScore"
              type="number"
              min={50}
              max={95}
              value={config.minMatchScore}
              onChange={(e) => setConfig(prev => ({ ...prev, minMatchScore: Math.max(50, Math.min(95, Number(e.target.value))) }))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">% (only save opportunities scoring at or above this threshold)</span>
          </div>
        </div>

        {/* Max Results */}
        <div className="space-y-2">
          <Label htmlFor="maxResults" className="text-foreground font-medium">
            Max Results Per Scan
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="maxResults"
              type="number"
              min={10}
              max={100}
              value={config.maxResultsPerScan}
              onChange={(e) => setConfig(prev => ({ ...prev, maxResultsPerScan: Math.max(10, Math.min(100, Number(e.target.value))) }))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">opportunities per scan cycle</span>
          </div>
        </div>

        {/* Preferred Regions */}
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Preferred Regions</Label>
          <p className="text-xs text-muted-foreground">Select regions to include in automatic scans</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {WORLD_REGIONS.map(region => (
              <button
                key={region.id}
                onClick={() => toggleRegion(region.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  config.preferredRegions.includes(region.id)
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {region.name}
              </button>
            ))}
          </div>
          {config.preferredRegions.length === 0 && (
            <p className="text-xs text-destructive">Select at least one region</p>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="space-y-3 pt-3 border-t border-border">
          <Label className="text-foreground font-medium">Auto-Scan Notifications</Label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground">Get emailed when high-match opportunities are found</p>
            </div>
            <Switch 
              checked={config.emailNotifications} 
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, emailNotifications: v }))} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Push notifications</p>
              <p className="text-xs text-muted-foreground">Browser push alerts for new opportunities</p>
            </div>
            <Switch 
              checked={config.pushNotifications} 
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, pushNotifications: v }))} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoScanSettings;
