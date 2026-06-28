import { useState, useEffect } from 'react';
import { UserX } from 'lucide-react';
import { supabase } from './lib/supabase';
import { BypassContext, ADMIN_PROFILE_ID } from './contexts/BypassContext';
import { ImpersonationProvider, useImpersonation } from './contexts/ImpersonationContext';
import { Navigation } from './components/Navigation';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/views/Dashboard';
import { QuestsView } from './components/views/QuestsView';
import { ChallengesView } from './components/views/ChallengesView';
import { BadgesView } from './components/views/BadgesView';
import { LeaderboardView } from './components/views/LeaderboardView';
import { CalendarView } from './components/views/CalendarView';
import { AdminView } from './components/views/AdminView';
import { RewardsView } from './components/views/RewardsView';
import { ProfileView } from './components/views/ProfileView';
import { ProjectsView } from './components/views/ProjectsView';
import { ProjectDetailView } from './components/views/ProjectDetailView';
import { CommunicationsView } from './components/views/CommunicationsView';
import { MyTasksView } from './components/views/MyTasksView';
import { IdeasView } from './components/views/IdeasView';
import { PulsesView } from './components/views/PulsesView';
import { GiftPointsView } from './components/views/GiftPointsView';
import { MessagesView } from './components/views/MessagesView';
import type { User } from '@supabase/supabase-js';
import type { Project } from './types/database';

function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, endImpersonation } = useImpersonation();
  if (!isImpersonating || !impersonatedUser) return null;

  const displayName = impersonatedUser.full_name || impersonatedUser.username || 'User';

  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        <UserX className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-semibold truncate">
          Impersonating: <span className="font-bold">{displayName}</span>
          <span className="font-normal opacity-80 ml-1.5">({impersonatedUser.role})</span>
        </span>
      </div>
      <button
        onClick={() => endImpersonation()}
        className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
      >
        <UserX className="w-3.5 h-3.5" />
        End Session
      </button>
    </div>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [bypassMode, setBypassMode] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const { isImpersonating, impersonatedUser } = useImpersonation();

  const effectiveBypassUserId = isImpersonating && impersonatedUser
    ? impersonatedUser.id
    : bypassMode
    ? ADMIN_PROFILE_ID
    : null;

  const effectiveBypassMode = isImpersonating ? true : bypassMode;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    if (view !== 'projects') setActiveProject(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user && !bypassMode) {
    return <LoginPage onAuthSuccess={() => setCurrentView('dashboard')} onBypass={() => setBypassMode(true)} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'quests': return <QuestsView />;
      case 'challenges': return <ChallengesView />;
      case 'badges': return <BadgesView />;
      case 'leaderboard': return <LeaderboardView />;
      case 'calendar': return <CalendarView />;
      case 'my-tasks': return <MyTasksView onNavigate={handleViewChange} />;
      case 'ideas': return <IdeasView />;
      case 'pulses': return <PulsesView />;
      case 'gift-points': return <GiftPointsView />;
      case 'messages': return <MessagesView />;
      case 'communications': return <CommunicationsView />;
      case 'admin': return <AdminView />;
      case 'rewards': return <RewardsView />;
      case 'profile': return <ProfileView onNavigate={handleViewChange} />;
      case 'projects':
        if (activeProject) {
          return <ProjectDetailView project={activeProject} onBack={() => setActiveProject(null)} />;
        }
        return <ProjectsView onOpenProject={(p: Project) => setActiveProject(p)} />;
      default: return <Dashboard />;
    }
  };

  return (
    <BypassContext.Provider value={{ bypassMode: effectiveBypassMode, bypassUserId: effectiveBypassUserId }}>
      <div className="min-h-screen bg-background">
        <ImpersonationBanner />
        <Navigation currentView={currentView} onViewChange={handleViewChange} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderView()}
        </main>
      </div>
    </BypassContext.Provider>
  );
}

function App() {
  return (
    <ImpersonationProvider>
      <AppContent />
    </ImpersonationProvider>
  );
}

export default App;
