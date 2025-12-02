import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Building, Sparkles, Loader2, Globe, BarChart2, Check, ChevronDown } from 'lucide-react';
import { Opportunity } from '@/types';
import { analyzeOpportunity } from '@/services/aiService';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const WORLD_REGIONS = [
  { id: 'dach', name: 'DACH (Germany, Austria, Switzerland)', countries: ['Germany', 'Austria', 'Switzerland'] },
  { id: 'see', name: 'SEE (Southeast Europe)', countries: ['Croatia', 'Serbia', 'Bosnia', 'Slovenia', 'North Macedonia', 'Albania', 'Montenegro', 'Kosovo'] },
  { id: 'nordics', name: 'Nordics', countries: ['Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland'] },
  { id: 'benelux', name: 'Benelux', countries: ['Belgium', 'Netherlands', 'Luxembourg'] },
  { id: 'uk_ireland', name: 'UK & Ireland', countries: ['United Kingdom', 'Ireland'] },
  { id: 'france', name: 'France', countries: ['France', 'Monaco'] },
  { id: 'iberia', name: 'Iberia', countries: ['Spain', 'Portugal'] },
  { id: 'italy', name: 'Italy', countries: ['Italy', 'San Marino', 'Vatican'] },
  { id: 'eastern_europe', name: 'Eastern Europe', countries: ['Poland', 'Czech Republic', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria'] },
  { id: 'baltics', name: 'Baltics', countries: ['Estonia', 'Latvia', 'Lithuania'] },
  { id: 'cis', name: 'CIS (Commonwealth)', countries: ['Russia', 'Ukraine', 'Belarus', 'Kazakhstan', 'Uzbekistan'] },
  { id: 'middle_east', name: 'Middle East', countries: ['UAE', 'Saudi Arabia', 'Qatar', 'Israel', 'Turkey', 'Egypt'] },
  { id: 'africa', name: 'Africa', countries: ['South Africa', 'Nigeria', 'Kenya', 'Morocco', 'Ghana'] },
  { id: 'south_asia', name: 'South Asia', countries: ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka'] },
  { id: 'southeast_asia', name: 'Southeast Asia', countries: ['Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Indonesia', 'Philippines'] },
  { id: 'east_asia', name: 'East Asia', countries: ['China', 'Japan', 'South Korea', 'Taiwan', 'Hong Kong'] },
  { id: 'oceania', name: 'Oceania', countries: ['Australia', 'New Zealand'] },
  { id: 'north_america', name: 'North America', countries: ['USA', 'Canada', 'Mexico'] },
  { id: 'latam', name: 'Latin America', countries: ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru'] },
  { id: 'caribbean', name: 'Caribbean', countries: ['Jamaica', 'Bahamas', 'Dominican Republic', 'Puerto Rico'] },
];

const INITIAL_JOBS: Opportunity[] = [
  {
    id: '1',
    title: 'Group Chief Operating Officer',
    company: 'Balkan Pharma Group',
    location: 'Sarajevo / Hybrid',
    salary_range: '€140k - €180k + Equity',
    match_score: 0,
    status: 'New',
    source: 'Executive Search',
    posted_date: '4h ago',
    description: 'Leading pharmaceutical group in SEE region seeking Group COO to oversee operations across 4 countries. Must have experience in supply chain optimization and EU regulatory compliance.'
  },
  {
    id: '2',
    title: 'VP Engineering / CTO',
    company: 'FinTech Zurich',
    location: 'Zurich, Switzerland',
    salary_range: 'CHF 220k - CHF 280k',
    match_score: 0,
    status: 'New',
    source: 'LinkedIn Jobs',
    posted_date: '12h ago',
    description: 'Scaling a Series B crypto-banking platform. Requires deep expertise in blockchain security, high-frequency trading systems, and leading distributed teams across DACH.'
  },
  {
    id: '3',
    title: 'Managing Director',
    company: 'AutoMotive Components DE',
    location: 'Stuttgart, Germany',
    salary_range: '€200k+',
    match_score: 0,
    status: 'New',
    source: 'Handelsblatt',
    posted_date: '1d ago',
    description: 'P&L responsibility for the e-mobility division. Driving transformation from traditional combustion to EV components. Strong leadership and restructuring experience required.'
  }
];

const OpportunityScanner: React.FC = () => {
  const { userProfile } = useApp();
  const [jobs, setJobs] = useState<Opportunity[]>(INITIAL_JOBS);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Opportunity | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['dach', 'see']);
  const [isScanning, setIsScanning] = useState(false);

  const handleAnalyze = async (job: Opportunity) => {
    setAnalyzingId(job.id);
    try {
      const result = await analyzeOpportunity(
        job.description,
        `${userProfile.bio} ${userProfile.targetRole} ${userProfile.industries}`
      );
      
      if (result) {
        const updatedJob: Opportunity = {
          ...job,
          match_score: result.match_score || 0,
          cultural_fit_score: result.cultural_fit_score,
          growth_potential: result.growth_potential,
          urgency: result.urgency,
          status: 'Analyzing',
          ai_analysis: {
            fit: result.fit_summary || '',
            gaps: result.gaps || [],
            strategy: result.strategy_recommendation || ''
          }
        };
        
        setJobs(jobs.map(j => j.id === job.id ? updatedJob : j));
        setSelectedJob(updatedJob);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const toggleRegion = (regionId: string) => {
    setSelectedRegions(prev => 
      prev.includes(regionId) 
        ? prev.filter(r => r !== regionId)
        : [...prev, regionId]
    );
  };

  const handleScan = async () => {
    setIsScanning(true);
    // Simulate scanning - in production this would call an API
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  const getSelectedRegionNames = () => {
    if (selectedRegions.length === 0) return 'Select Regions';
    if (selectedRegions.length <= 2) {
      return selectedRegions.map(id => {
        const region = WORLD_REGIONS.find(r => r.id === id);
        return region?.name.split(' ')[0] || id;
      }).join(' + ');
    }
    return `${selectedRegions.length} regions selected`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success bg-success/10 border-success/30';
    if (score >= 60) return 'text-primary bg-primary/10 border-primary/30';
    return 'text-accent bg-accent/10 border-accent/30';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Opportunity Mining</h1>
          <p className="text-muted-foreground mt-1">
            AI-analyzed executive opportunities in {selectedRegions.length > 0 ? getSelectedRegionNames() : 'selected regions'}
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Globe className="w-4 h-4 mr-2" />
                {getSelectedRegionNames()}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 max-h-96 overflow-y-auto bg-popover border border-border z-50">
              <DropdownMenuLabel>Select Target Regions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">Europe</DropdownMenuLabel>
              {WORLD_REGIONS.filter(r => ['dach', 'see', 'nordics', 'benelux', 'uk_ireland', 'france', 'iberia', 'italy', 'eastern_europe', 'baltics'].includes(r.id)).map(region => (
                <DropdownMenuCheckboxItem
                  key={region.id}
                  checked={selectedRegions.includes(region.id)}
                  onCheckedChange={() => toggleRegion(region.id)}
                >
                  <div>
                    <div className="font-medium">{region.name}</div>
                    <div className="text-xs text-muted-foreground">{region.countries.slice(0, 3).join(', ')}{region.countries.length > 3 ? '...' : ''}</div>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">CIS & Middle East</DropdownMenuLabel>
              {WORLD_REGIONS.filter(r => ['cis', 'middle_east'].includes(r.id)).map(region => (
                <DropdownMenuCheckboxItem
                  key={region.id}
                  checked={selectedRegions.includes(region.id)}
                  onCheckedChange={() => toggleRegion(region.id)}
                >
                  <div>
                    <div className="font-medium">{region.name}</div>
                    <div className="text-xs text-muted-foreground">{region.countries.slice(0, 3).join(', ')}{region.countries.length > 3 ? '...' : ''}</div>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Asia & Pacific</DropdownMenuLabel>
              {WORLD_REGIONS.filter(r => ['south_asia', 'southeast_asia', 'east_asia', 'oceania'].includes(r.id)).map(region => (
                <DropdownMenuCheckboxItem
                  key={region.id}
                  checked={selectedRegions.includes(region.id)}
                  onCheckedChange={() => toggleRegion(region.id)}
                >
                  <div>
                    <div className="font-medium">{region.name}</div>
                    <div className="text-xs text-muted-foreground">{region.countries.slice(0, 3).join(', ')}{region.countries.length > 3 ? '...' : ''}</div>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Americas & Africa</DropdownMenuLabel>
              {WORLD_REGIONS.filter(r => ['north_america', 'latam', 'caribbean', 'africa'].includes(r.id)).map(region => (
                <DropdownMenuCheckboxItem
                  key={region.id}
                  checked={selectedRegions.includes(region.id)}
                  onCheckedChange={() => toggleRegion(region.id)}
                >
                  <div>
                    <div className="font-medium">{region.name}</div>
                    <div className="text-xs text-muted-foreground">{region.countries.slice(0, 3).join(', ')}{region.countries.length > 3 ? '...' : ''}</div>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button size="sm" onClick={handleScan} disabled={isScanning || selectedRegions.length === 0}>
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Scan New
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Selected Regions Summary */}
      {selectedRegions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRegions.map(regionId => {
            const region = WORLD_REGIONS.find(r => r.id === regionId);
            return region ? (
              <span key={regionId} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full border border-primary/30">
                {region.name.split(' ')[0]}
              </span>
            ) : null;
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job List */}
        <div className="lg:col-span-2 space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`bg-card border rounded-xl p-5 cursor-pointer transition-all hover:border-primary/50 ${
                selectedJob?.id === job.id ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{job.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Building className="w-4 h-4" />
                    <span>{job.company}</span>
                  </div>
                </div>
                {job.match_score > 0 ? (
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getScoreColor(job.match_score)}`}>
                    {job.match_score}% Match
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                    {job.status}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 mb-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {job.salary_range}
                </span>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{job.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-muted rounded">{job.source}</span>
                  <span className="px-2 py-1 bg-muted rounded">{job.posted_date}</span>
                </div>
                <Button
                  size="sm"
                  variant={job.match_score > 0 ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnalyze(job);
                  }}
                  disabled={analyzingId === job.id}
                >
                  {analyzingId === job.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing
                    </>
                  ) : job.match_score > 0 ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Analyzed
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Panel */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">AI Analysis</h3>
          </div>

          {selectedJob?.ai_analysis ? (
            <div className="space-y-6">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className={`text-2xl font-bold ${selectedJob.match_score >= 70 ? 'text-success' : 'text-primary'}`}>
                    {selectedJob.match_score}%
                  </div>
                  <p className="text-xs text-muted-foreground">Match Score</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className={`text-2xl font-bold ${(selectedJob.cultural_fit_score || 0) >= 70 ? 'text-success' : 'text-primary'}`}>
                    {selectedJob.cultural_fit_score || 'N/A'}%
                  </div>
                  <p className="text-xs text-muted-foreground">Cultural Fit</p>
                </div>
              </div>

              {/* Growth & Urgency */}
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedJob.growth_potential === 'High' ? 'bg-success/10 text-success border border-success/30' :
                  selectedJob.growth_potential === 'Medium' ? 'bg-primary/10 text-primary border border-primary/30' :
                  'bg-muted text-muted-foreground'
                }`}>
                  Growth: {selectedJob.growth_potential}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedJob.urgency === 'High' ? 'bg-destructive/10 text-destructive border border-destructive/30' :
                  selectedJob.urgency === 'Medium' ? 'bg-accent/10 text-accent border border-accent/30' :
                  'bg-muted text-muted-foreground'
                }`}>
                  Urgency: {selectedJob.urgency}
                </span>
              </div>

              {/* Fit Summary */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Fit Summary</h4>
                <p className="text-sm text-muted-foreground">{selectedJob.ai_analysis.fit}</p>
              </div>

              {/* Gaps */}
              {selectedJob.ai_analysis.gaps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Skill Gaps to Address</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.ai_analysis.gaps.map((gap, i) => (
                      <span key={i} className="px-2 py-1 bg-accent/10 text-accent text-xs rounded border border-accent/30">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategy */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="text-sm font-medium text-foreground mb-2">Recommended Strategy</h4>
                <p className="text-sm text-muted-foreground">{selectedJob.ai_analysis.strategy}</p>
              </div>

              <Button className="w-full">
                Apply to {selectedJob.company}
              </Button>
            </div>
          ) : selectedJob ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                Click "AI Analyze" to get detailed insights for this opportunity
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">
                Select an opportunity to view details and AI analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpportunityScanner;
