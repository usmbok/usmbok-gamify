import { useState, useEffect } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  current_level: number;
  total_points: number;
  total_xp: number;
  reputation_score: number;
  department: string | null;
  industry_sector: string | null;
  created_at: string;
  updated_at: string;
  role?: string;
}

interface UserEditForm {
  full_name: string;
  username: string;
  department: string;
  industry_sector: string;
  current_level: number;
  total_points: number;
  total_xp: number;
  reputation_score: number;
  role: string;
}

interface Props {
  user: UserProfile;
  onClose: () => void;
  onSaved: () => void;
}

export function UserEditModal({ user, onClose, onSaved }: Props) {
  const [form, setForm] = useState<UserEditForm>({
    full_name: user.full_name || '',
    username: user.username || '',
    department: user.department || '',
    industry_sector: user.industry_sector || '',
    current_level: user.current_level,
    total_points: user.total_points,
    total_xp: user.total_xp,
    reputation_score: user.reputation_score,
    role: user.role || 'user',
  });
  const [quests, setQuests] = useState<{ id: string; name: string }[]>([]);
  const [badges, setBadges] = useState<{ id: string; name: string }[]>([]);
  const [challenges, setChallenges] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'quests' | 'badges' | 'challenges' | 'projects'>('profile');
  const [userQuests, setUserQuests] = useState<string[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [userChallenges, setUserChallenges] = useState<string[]>([]);

  useEffect(() => {
    loadRelated();
  }, []);

  const loadRelated = async () => {
    const [qRes, bRes, cRes, pRes, uqRes, ubRes, ucRes] = await Promise.all([
      supabase.from('quests').select('id, name').eq('status', 'active').order('name'),
      supabase.from('badges').select('id, name').eq('is_active', true).order('name'),
      supabase.from('challenges').select('id, name').eq('is_active', true).order('name'),
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('user_quest_progress').select('quest_id').eq('user_id', user.id),
      supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
      supabase.from('user_challenge_progress').select('challenge_id').eq('user_id', user.id),
    ]);
    setQuests(qRes.data || []);
    setBadges(bRes.data || []);
    setChallenges(cRes.data || []);
    setProjects(pRes.data || []);
    setUserQuests((uqRes.data || []).map((r: { quest_id: string }) => r.quest_id));
    setUserBadges((ubRes.data || []).map((r: { badge_id: string }) => r.badge_id));
    setUserChallenges((ucRes.data || []).map((r: { challenge_id: string }) => r.challenge_id));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name || null,
          username: form.username || null,
          department: form.department || null,
          industry_sector: form.industry_sector || null,
          current_level: form.current_level,
          total_points: form.total_points,
          total_xp: form.total_xp,
          reputation_score: form.reputation_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (profileErr) throw profileErr;

      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingRole) {
        if (existingRole.role !== form.role) {
          await supabase.from('user_roles').update({ role: form.role }).eq('user_id', user.id);
        }
      } else {
        await supabase.from('user_roles').insert({ user_id: user.id, role: form.role });
      }

      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleQuest = async (questId: string, checked: boolean) => {
    if (checked) {
      await supabase.from('user_quest_progress').insert({
        user_id: user.id,
        quest_id: questId,
        current_step: 0,
        completed_steps: [],
        is_completed: false,
        started_at: new Date().toISOString(),
      });
      setUserQuests(prev => [...prev, questId]);
    } else {
      await supabase.from('user_quest_progress').delete().eq('user_id', user.id).eq('quest_id', questId);
      setUserQuests(prev => prev.filter(id => id !== questId));
    }
  };

  const toggleBadge = async (badgeId: string, checked: boolean) => {
    if (checked) {
      await supabase.from('user_badges').insert({
        user_id: user.id,
        badge_id: badgeId,
        earned_at: new Date().toISOString(),
      });
      setUserBadges(prev => [...prev, badgeId]);
    } else {
      await supabase.from('user_badges').delete().eq('user_id', user.id).eq('badge_id', badgeId);
      setUserBadges(prev => prev.filter(id => id !== badgeId));
    }
  };

  const toggleChallenge = async (challengeId: string, checked: boolean) => {
    if (checked) {
      await supabase.from('user_challenge_progress').insert({
        user_id: user.id,
        challenge_id: challengeId,
        progress_data: {},
        is_completed: false,
        started_at: new Date().toISOString(),
      });
      setUserChallenges(prev => [...prev, challengeId]);
    } else {
      await supabase.from('user_challenge_progress').delete().eq('user_id', user.id).eq('challenge_id', challengeId);
      setUserChallenges(prev => prev.filter(id => id !== challengeId));
    }
  };

  const tabLabels = [
    { id: 'profile', label: 'Profile & Role' },
    { id: 'quests', label: 'Quests' },
    { id: 'badges', label: 'Badges' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'projects', label: 'Projects' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold">Edit User</h3>
            <p className="text-sm text-muted-foreground">{user.full_name || user.username}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
          {tabLabels.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Username</label>
                  <input
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Department</label>
                  <input
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Industry Sector</label>
                  <input
                    value={form.industry_sector}
                    onChange={e => setForm(f => ({ ...f, industry_sector: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-semibold">Gamification Stats</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    { label: 'Current Level', key: 'current_level' as const, min: 1, max: 99 },
                    { label: 'Total Points', key: 'total_points' as const, min: 0, max: 9999999 },
                    { label: 'Total XP', key: 'total_xp' as const, min: 0, max: 9999999 },
                    { label: 'Reputation Score', key: 'reputation_score' as const, min: 0, max: 100 },
                  ] as const).map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-sm font-medium">{field.label}</label>
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={form[field.key]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quests' && (
            <AssignmentList
              label="Active Quests"
              items={quests}
              assigned={userQuests}
              onToggle={toggleQuest}
            />
          )}

          {activeTab === 'badges' && (
            <AssignmentList
              label="Badges"
              items={badges}
              assigned={userBadges}
              onToggle={toggleBadge}
            />
          )}

          {activeTab === 'challenges' && (
            <AssignmentList
              label="Challenges"
              items={challenges}
              assigned={userChallenges}
              onToggle={toggleChallenge}
            />
          )}

          {activeTab === 'projects' && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Project membership is managed from the Projects page.</p>
            </div>
          )}
        </div>

        {activeTab === 'profile' && (
          <div className="flex justify-end gap-3 p-5 border-t border-border flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentList({
  label,
  items,
  assigned,
  onToggle,
}: {
  label: string;
  items: { id: string; name: string }[];
  assigned: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <span className="text-xs text-muted-foreground">{assigned.length} assigned</span>
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}...`}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filtered.map(item => (
          <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer">
            <input
              type="checkbox"
              checked={assigned.includes(item.id)}
              onChange={e => onToggle(item.id, e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">{item.name}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No items found.</p>
        )}
      </div>
    </div>
  );
}
