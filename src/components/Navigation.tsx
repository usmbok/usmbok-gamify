import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home,
  Trophy,
  Target,
  Award,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  Gift,
  User,
  Star,
  FolderKanban,
  LogOut,
  KeyRound,
  ChevronDown,
  Shield,
  ClipboardList,
  Mail,
  MailOpen,
  AlertCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { useBypass } from '../contexts/BypassContext';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

interface UnreadMessage {
  id: string;
  message_id: string;
  subject: string;
  body: string;
  priority: 'normal' | 'high' | 'alert';
  sender_name: string;
  created_at: string;
}

const PRIORITY_ICON: Record<string, React.ElementType> = {
  normal: Mail,
  high: ArrowUpCircle,
  alert: AlertCircle,
};

const PRIORITY_COLOR: Record<string, string> = {
  normal: 'text-blue-500',
  high: 'text-orange-500',
  alert: 'text-red-500',
};

const PRIORITY_BADGE: Record<string, string> = {
  normal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  alert: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [myTasksOpen, setMyTasksOpen] = useState(false);
  const [mobileMyTasksOpen, setMobileMyTasksOpen] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const { bypassMode } = useBypass();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const { isAdmin } = useAdmin();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const myTasksRef = useRef<HTMLDivElement>(null);

  const myTasksViews = new Set(['my-tasks', 'quests', 'challenges']);
  const isMyTasksActive = myTasksViews.has(currentView);

  useEffect(() => {
    loadUser();
  }, [bypassMode, isImpersonating, impersonatedUser]);

  useEffect(() => {
    if (currentUserId) loadUnreadMessages();
  }, [currentUserId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(e.target as Node)) {
        setMessagesOpen(false);
      }
      if (myTasksRef.current && !myTasksRef.current.contains(e.target as Node)) {
        setMyTasksOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUser = async () => {
    if (isImpersonating && impersonatedUser) {
      const { data } = await supabase
        .from('profiles')
        .select('total_points, full_name, username')
        .eq('id', impersonatedUser.id)
        .maybeSingle();
      if (data) {
        setPoints(data.total_points);
        setUserName(data.full_name || data.username || 'User');
      } else {
        setUserName(impersonatedUser.full_name || impersonatedUser.username || 'User');
        setPoints(null);
      }
      setCurrentUserId(impersonatedUser.id);
      setUserEmail(null);
      return;
    }
    if (bypassMode) {
      setUserName('Admin (Bypass)');
      setUserEmail(null);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email ?? null);
    setCurrentUserId(user.id);
    const { data } = await supabase
      .from('profiles')
      .select('total_points, full_name, username')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      setPoints(data.total_points);
      setUserName(data.full_name || data.username || user.email?.split('@')[0] || null);
    }
  };

  const loadUnreadMessages = useCallback(async () => {
    if (!currentUserId) return;

    type RecipientRow = {
      id: string;
      message_id: string;
      is_read: boolean;
      created_at: string;
      message: { subject: string; body: string; priority: string; sent_by: string | null } | null;
    };

    const { data, error } = await supabase
      .from('admin_message_recipients')
      .select('id, message_id, is_read, created_at, message:message_id(subject, body, priority, sent_by)')
      .eq('recipient_id', currentUserId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) return;

    const rows = data as unknown as RecipientRow[];
    const senderIds = [...new Set(rows.map(r => r.message?.sent_by).filter((id): id is string => Boolean(id)))];
    let senderMap: Record<string, string> = {};
    if (senderIds.length > 0) {
      const { data: senders } = await supabase.from('profiles').select('id, full_name, username').in('id', senderIds);
      for (const s of (senders || [])) {
        senderMap[s.id] = s.full_name || s.username || 'System';
      }
    }

    const msgs: UnreadMessage[] = rows.filter(r => r.message).map(r => ({
      id: r.id,
      message_id: r.message_id,
      subject: r.message!.subject,
      body: r.message!.body,
      priority: (r.message!.priority as UnreadMessage['priority']) || 'normal',
      sender_name: r.message!.sent_by ? (senderMap[r.message!.sent_by] || 'System') : 'System',
      created_at: r.created_at,
    }));
    setUnreadMessages(msgs);
  }, [currentUserId]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    window.location.reload();
  };

  const openMessages = () => {
    setMessagesOpen(v => !v);
    setUserMenuOpen(false);
  };

  const goToMessages = () => {
    setMessagesOpen(false);
    onViewChange('messages');
  };

  const navigate = (view: string) => {
    onViewChange(view);
    setMyTasksOpen(false);
    setMobileMenuOpen(false);
    setMobileMyTasksOpen(false);
  };

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { id: 'admin', label: 'Admin', icon: Settings },
  ];

  const subscriberNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'rewards', label: 'Rewards', icon: Gift },
  ];

  const mainNavItems = isAdmin ? adminNavItems : subscriberNavItems;

  const myTasksSubItems = [
    { id: 'my-tasks', label: 'My Tasks', icon: ClipboardList },
    { id: 'quests', label: 'Quests', icon: Target },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
  ];

  const logoSrc = resolvedTheme === 'dark'
    ? '/USMBOK_2025_white_logo.png'
    : '/USMBOK_2026_logo-registered.png';

  const initials = userName
    ? userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const unreadCount = unreadMessages.length;

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="relative flex items-center py-3 px-4 sm:px-6 lg:px-8 border-b border-border/50">
        <img
          src={logoSrc}
          alt="USMBOK Logo"
          style={{ height: '44px', width: 'auto', maxWidth: '200px', objectFit: 'contain', flexShrink: 0 }}
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight text-foreground whitespace-nowrap hidden sm:block">
          USMBOK: Gamify
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="hidden md:flex items-center gap-0.5">

            {/* My Tasks dropdown */}
            <div className="relative" ref={myTasksRef}>
              <button
                onClick={() => setMyTasksOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isMyTasksActive || myTasksOpen
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>My Tasks</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${myTasksOpen ? 'rotate-180' : ''}`} />
              </button>

              {myTasksOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
                  {myTasksSubItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                          currentView === item.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Remaining main nav items */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    currentView === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {points !== null && (
              <button
                onClick={() => navigate('rewards')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 rounded-lg transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                  {points.toLocaleString()}
                </span>
              </button>
            )}

            {currentUserId && (
              <div className="relative" ref={messagesRef}>
                <button
                  onClick={openMessages}
                  className={`relative p-2 rounded-lg transition-colors ${
                    messagesOpen || currentView === 'messages'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-accent text-foreground'
                  }`}
                  title="Messages"
                >
                  <Mail className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {messagesOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <div>
                        <p className="font-semibold text-sm">Unread Messages</p>
                        <p className="text-xs text-muted-foreground">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
                      </div>
                      <button onClick={() => setMessagesOpen(false)} className="p-1 rounded hover:bg-accent text-muted-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {unreadMessages.length === 0 ? (
                        <div className="py-8 text-center">
                          <MailOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                          <p className="text-sm text-muted-foreground">No unread messages</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {unreadMessages.map(msg => {
                            const PIcon = PRIORITY_ICON[msg.priority];
                            return (
                              <button
                                key={msg.id}
                                onClick={goToMessages}
                                className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 flex-shrink-0 ${PRIORITY_COLOR[msg.priority]}`}>
                                    <PIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_BADGE[msg.priority]}`}>
                                        {msg.priority.charAt(0).toUpperCase() + msg.priority.slice(1)}
                                      </span>
                                    </div>
                                    <p className="font-semibold text-sm leading-tight">{msg.subject}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{msg.sender_name} &middot; {new Date(msg.created_at).toLocaleDateString()}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{msg.body}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border px-4 py-2.5">
                      <button
                        onClick={goToMessages}
                        className="w-full text-center text-sm text-primary font-medium hover:underline"
                      >
                        View All Messages
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ThemeToggle />

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${
                  currentView === 'profile' || currentView === 'badges' || userMenuOpen
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-accent text-foreground'
                }`}
                title={userName ?? 'My Account'}
              >
                <div className={`relative w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${isImpersonating ? 'bg-amber-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                  {bypassMode && !isImpersonating ? <Shield className="w-3.5 h-3.5" /> : initials}
                  {isImpersonating && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-300 border border-white rounded-full" />}
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isImpersonating ? 'bg-amber-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                        {bypassMode && !isImpersonating ? <Shield className="w-4 h-4" /> : initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{userName ?? 'User'}</p>
                        {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
                        {isImpersonating && <p className="text-xs text-amber-500 font-semibold">Impersonation Active</p>}
                        {bypassMode && !isImpersonating && <p className="text-xs text-amber-500">Dev Bypass Mode</p>}
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { navigate('profile'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      My Profile
                    </button>
                    <button
                      onClick={() => { navigate('badges'); setUserMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                        currentView === 'badges'
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <Award className="w-4 h-4 text-muted-foreground" />
                      Badges
                    </button>
                    <button
                      onClick={() => { navigate('messages'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>Messages</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    {!bypassMode && (
                      <button
                        onClick={() => { navigate('profile'); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                      >
                        <KeyRound className="w-4 h-4 text-muted-foreground" />
                        Change Password
                      </button>
                    )}
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg bg-secondary hover:bg-accent transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border">
          <div className="px-4 py-2 space-y-1">

            {/* My Tasks expandable section */}
            <button
              onClick={() => setMobileMyTasksOpen(v => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isMyTasksActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="flex-1 text-left">My Tasks</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileMyTasksOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileMyTasksOpen && (
              <div className="ml-4 space-y-1 border-l-2 border-border pl-3">
                {myTasksSubItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                        currentView === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentView === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="border-t border-border pt-1">
              <button
                onClick={() => navigate('messages')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'messages'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Mail className="w-5 h-5" />
                <span>Messages</span>
                {unreadCount > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('badges')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'badges'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Award className="w-5 h-5" />
                <span>Badges</span>
              </button>
              <button
                onClick={() => navigate('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'profile'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <User className="w-5 h-5" />
                <span>My Profile</span>
              </button>
              {!bypassMode && (
                <button
                  onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
