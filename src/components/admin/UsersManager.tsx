import { useEffect, useState, useCallback } from 'react';
import { Users, Search, Shield, Star, UserCheck, KeyRound, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBypass } from '../../contexts/BypassContext';
import { useImpersonation, ROLE_RANK } from '../../contexts/ImpersonationContext';
import { UserDetailPanel } from './users/UserDetailPanel';
import { UserEditModal } from './users/UserEditModal';

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

const roleColors: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-500',
  moderator: 'bg-orange-500/10 text-orange-500',
  user: 'bg-secondary text-muted-foreground',
};

export function UsersManager() {
  const { bypassMode, bypassUserId } = useBypass();
  const { startImpersonation } = useImpersonation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<UserProfile | null>(null);
  const [passwordResetTarget, setPasswordResetTarget] = useState<UserProfile | null>(null);
  const [currentAdminRole, setCurrentAdminRole] = useState<string>('admin');
  const [impersonationNote, setImpersonationNote] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadCurrentAdminRole();
  }, []);

  const loadCurrentAdminRole = async () => {
    if (bypassMode) { setCurrentAdminRole('admin'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    setCurrentAdminRole(data?.role || 'admin');
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false });

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r: { user_id: string; role: string }) => {
      roleMap[r.user_id] = r.role;
    });

    const enriched = (profiles || []).map(p => ({
      ...p,
      role: roleMap[p.id] || 'user',
    }));

    setUsers(enriched);
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!passwordResetTarget) return;
    setResetLoading(true);
    setResetError(null);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setResetError('Not authenticated'); setResetLoading(false); return; }

    const { error } = await supabase.auth.resetPasswordForEmail(
      passwordResetTarget.username || `user_${passwordResetTarget.id}@noreply.local`,
      { redirectTo: window.location.origin }
    );
    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
    }
    setResetLoading(false);
  };

  const handleImpersonate = async () => {
    if (!impersonateTarget) return;

    const adminRoleRank = ROLE_RANK[currentAdminRole] ?? 1;
    const targetRoleRank = ROLE_RANK[impersonateTarget.role || 'user'] ?? 1;
    if (adminRoleRank < targetRoleRank) return;

    setImpersonating(true);

    let adminId: string | null = null;
    if (bypassMode && bypassUserId) {
      adminId = bypassUserId;
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      adminId = authUser?.id ?? null;
    }

    if (adminId) {
      await startImpersonation(
        {
          id: impersonateTarget.id,
          full_name: impersonateTarget.full_name,
          username: impersonateTarget.username,
          role: impersonateTarget.role || 'user',
        },
        adminId,
        currentAdminRole,
        impersonationNote || 'Admin review',
      );
    }

    setImpersonating(false);
    setImpersonateTarget(null);
    setImpersonationNote('');
  };

  const filtered = users.filter(u => {
    const matchSearch = !search.trim() ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    users: users.filter(u => u.role === 'user' || !u.role).length,
  };

  const initials = (u: UserProfile) =>
    (u.full_name || u.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">User Management</h3>
        <span className="text-sm text-muted-foreground">{users.length} total users</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: counts.total, color: 'text-primary' },
          { label: 'Admins', value: counts.admins, color: 'text-red-500' },
          { label: 'Moderators', value: counts.moderators, color: 'text-orange-500' },
          { label: 'Members', value: counts.users, color: 'text-green-500' },
        ].map(s => (
          <div key={s.label} className="bg-secondary rounded-xl p-4">
            <p className={`text-xs font-medium mb-1 ${s.color}`}>{s.label}</p>
            <p className="text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, username, department..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
      </div>

      <div className="flex gap-4">
        <div className={`bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 ${selectedUser ? 'flex-1' : 'w-full'}`}>
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground">User</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Level</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Points</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden xl:table-cell">Department</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => {
                const isSelected = selectedUser?.id === u.id;
                const canImpersonate = (ROLE_RANK[currentAdminRole] ?? 1) >= (ROLE_RANK[u.role || 'user'] ?? 1);
                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(isSelected ? null : u)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-accent/20'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{initials(u)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.full_name || u.username || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role || 'user']}`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                        L{u.current_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="font-medium">{u.total_points.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs truncate max-w-[120px]">
                      {u.department || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Edit user"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setPasswordResetTarget(u); setResetSuccess(false); setResetError(null); }}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {canImpersonate && (
                          <button
                            onClick={() => { setImpersonateTarget(u); setImpersonationNote(''); }}
                            className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500"
                            title="Impersonate user"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No users found{search ? ` matching "${search}"` : ''}</p>
            </div>
          )}
        </div>

        {selectedUser && (
          <UserDetailPanel
            user={selectedUser}
            currentAdminRole={currentAdminRole}
            onClose={() => setSelectedUser(null)}
            onEdit={() => { setEditingUser(selectedUser); }}
            onImpersonate={() => { setImpersonateTarget(selectedUser); setImpersonationNote(''); }}
            onPasswordReset={() => { setPasswordResetTarget(selectedUser); setResetSuccess(false); setResetError(null); }}
          />
        )}
      </div>

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers(); if (selectedUser?.id === editingUser.id) setSelectedUser(null); }}
        />
      )}

      {impersonateTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setImpersonateTarget(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold">Impersonate User</h3>
              </div>
              <button onClick={() => setImpersonateTarget(null)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You are about to impersonate <strong>{impersonateTarget.full_name || impersonateTarget.username}</strong>. This action is logged for audit purposes.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  value={impersonationNote}
                  onChange={e => setImpersonationNote(e.target.value)}
                  placeholder="e.g. Troubleshooting user issue #1234"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Rule: You can only impersonate users with equal or lower access level than your own. Impersonation sessions are fully audited.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button onClick={() => setImpersonateTarget(null)} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
              <button
                onClick={handleImpersonate}
                disabled={impersonating}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {impersonating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordResetTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPasswordResetTarget(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Reset Password</h3>
              </div>
              <button onClick={() => setPasswordResetTarget(null)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {resetSuccess ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm text-center font-medium">Password reset email sent successfully.</p>
                  <p className="text-xs text-muted-foreground text-center">
                    {passwordResetTarget.full_name || passwordResetTarget.username} will receive an email with a reset link.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Send a password reset email to <strong className="text-foreground">{passwordResetTarget.full_name || passwordResetTarget.username}</strong>?
                  </p>
                  {resetError && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{resetError}
                    </div>
                  )}
                </>
              )}
            </div>
            {!resetSuccess && (
              <div className="flex justify-end gap-3 p-5 border-t border-border">
                <button onClick={() => setPasswordResetTarget(null)} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
                <button
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {resetLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Send Reset Email
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
