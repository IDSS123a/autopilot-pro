import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import LoadingScreen from '@/components/common/LoadingScreen';
import { useLogStore } from '@/store/useLogStore';
import { useApp } from '@/contexts/AppContext';
import { useSessionTracker } from '@/hooks/useSessionTracker';

const CommandCenter = lazy(() => import('@/components/dashboard/CommandCenter'));
const CVAnalyzer = lazy(() => import('@/components/cv/CVAnalyzer'));
const OpportunityScanner = lazy(() => import('@/components/opportunities/OpportunityScanner'));
const RecruiterAgent = lazy(() => import('@/components/recruiters/RecruiterAgent'));
const CommunicationHub = lazy(() => import('@/components/communication/CommunicationHub'));
const DueDiligence = lazy(() => import('@/components/duediligence/DueDiligence'));
const InterviewCalendar = lazy(() => import('@/components/calendar/InterviewCalendar').then(m => ({ default: m.InterviewCalendar })));
const Settings = lazy(() => import('@/components/settings/Settings'));
const AuthAuditLog = lazy(() => import('@/components/admin/AuthAuditLog'));
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));

const AutonomousAgentSimulator: React.FC = () => {
  const { addAgentLog } = useLogStore();

  useEffect(() => {
    const activities = [
      { msg: "Mining Agent: Scanned 14 new listings in DACH region", type: 'Opportunity Miner' as const },
      { msg: "Comms Orchestrator: Sent 7-day follow-up to Michael Ross", type: 'Comms Orchestrator' as const },
      { msg: "CV Analyst: Optimized keyword density for 'Digital Transformation'", type: 'CV Analyst' as const },
      { msg: "Discovery Agent: Identified new Head of Search at Egon Zehnder", type: 'Recruiter Discovery' as const },
      { msg: "Strategist: Detected high demand for AI Ops roles in Zurich", type: 'Campaign Strategist' as const },
    ];

    const interval = setInterval(() => {
      if (Math.random() > 0.65) {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        addAgentLog({ agent: activity.type, message: activity.msg, status: 'info' });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [addAgentLog]);

  return null;
};

const AppLayout: React.FC = () => {
  const { user, isLoading } = useApp();
  
  // Track user sessions and page views
  useSessionTracker();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileNav />
      <AutonomousAgentSimulator />
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-[60px] md:pt-0">
        <div className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<CommandCenter />} />
                <Route path="/cv-analysis" element={<CVAnalyzer />} />
                <Route path="/opportunities" element={<OpportunityScanner />} />
                <Route path="/recruiters" element={<RecruiterAgent />} />
                <Route path="/communication" element={<CommunicationHub />} />
                <Route path="/due-diligence" element={<DueDiligence />} />
                <Route path="/calendar" element={<InterviewCalendar />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin/audit-log" element={<AuthAuditLog />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
