import { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2, X, Check, Search, AlertCircle, UserPlus, UserMinus, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';

interface Community {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  color: string;
  is_active: boolean;
  is_public: boolean;
  member_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CommunityMember {
  id: string;
  user_id: string;
  role: 'owner' | 'moderator' | 'member';
  join_method: string;
  joined_at: string;
  notes: string | null;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    current_level: number;
    total_points: number;
  } | null;
}

interface UserOption {
  id: string;
  full_name: string | null;
  username: string | null;
}

interface CommunityForm {
  name: string;
  description: string;
  tags: string;
  color: string;
  is_active: boolean;
  is_public: boolean;
}

const emptyForm: CommunityForm = {
  name: '',
  description: '',
  tags: '',
  color: '#3b82f6',
  is_active: true,
  is_public: true,
};

const COLOR_PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b',
];

export function CommunitiesManager() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Community | null>(null);
  const [form, setForm] = useState<CommunityForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Community | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<'member' | 'moderator'>('member');
  const [addingMembers, setAddingMembers] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterActive, setFilterActive] = useState<string>('all');

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedCommunity) loadMembers(selectedCommunity.id);
  }, [selectedCommunity]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false });
    setCommunities(data || []);
    setLoading(false);
  };

  const loadMembers = async (communityId: string) => {
    setMembersLoading(true);
    const { data } = await supabase
      .from('community_members')
      .select('*, profile:user_id(id, full_name, username, current_level, total_points)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false });
    setMembers(data || []);
    setMembersLoading(false);
  };

  const loadUserOptions = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .order('full_name');
    setUserOptions(data || []);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (c: Community) => {
    setForm({
      name: c.name,
      description: c.description || '',
      tags: c.tags.join(', '),
      color: c.color,
      is_active: c.is_active,
      is_public: c.is_public,
    });
    setEditTarget(c);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      color: form.color,
      is_active: form.is_active,
      is_public: form.is_public,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('communities').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('communities').insert(payload);
        if (err) throw err;
      }
      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    await supabase.from('communities').delete().eq('id', deleteTarget.id);
    if (selectedCommunity?.id === deleteTarget.id) setSelectedCommunity(null);
    setDeleteTarget(null);
    await load();
    setSaving(false);
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('community_members').delete().eq('id', memberId);
    if (selectedCommunity) loadMembers(selectedCommunity.id);
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    await supabase.from('community_members').update({ role }).eq('id', memberId);
    if (selectedCommunity) loadMembers(selectedCommunity.id);
  };

  const openAddMembers = () => {
    setSelectedUserIds(new Set());
    setBulkRole('member');
    loadUserOptions();
    setAddMemberOpen(true);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const addSelectedMembers = async () => {
    if (!selectedCommunity || selectedUserIds.size === 0) return;
    setAddingMembers(true);
    const existingIds = new Set(members.map(m => m.user_id));
    const toAdd = [...selectedUserIds].filter(id => !existingIds.has(id));
    if (toAdd.length > 0) {
      await supabase.from('community_members').insert(
        toAdd.map(userId => ({
          community_id: selectedCommunity.id,
          user_id: userId,
          role: bulkRole,
          join_method: 'bulk',
        }))
      );
    }
    setAddMemberOpen(false);
    setAddingMembers(false);
    loadMembers(selectedCommunity.id);
    load();
  };

  const filteredCommunities = communities.filter(c => {
    const matchSearch = !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? c.is_active : !c.is_active);
    return matchSearch && matchActive;
  });

  const filteredUserOptions = userOptions.filter(u => {
    const alreadyMember = members.some(m => m.user_id === u.id);
    if (alreadyMember) return false;
    if (!memberSearch.trim()) return true;
    return (u.full_name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(memberSearch.toLowerCase());
  });

  const userInitials = (u: { full_name: string | null; username: string | null }) =>
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
        <h3 className="text-2xl font-bold">Community Management</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Community
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Communities', value: communities.length, color: 'text-primary' },
          { label: 'Active', value: communities.filter(c => c.is_active).length, color: 'text-green-500' },
          { label: 'Total Members', value: communities.reduce((sum, c) => sum + c.member_count, 0), color: 'text-blue-500' },
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
            placeholder="Search communities..."
            className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="flex gap-4">
        <div className={`space-y-3 transition-all duration-200 ${selectedCommunity ? 'flex-1' : 'w-full'}`}>
          {filteredCommunities.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No communities found.</p>
            </div>
          ) : filteredCommunities.map(c => {
            const isSelected = selectedCommunity?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCommunity(isSelected ? null : c)}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:bg-accent/20 hover:border-primary/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: c.color + '20', border: `2px solid ${c.color}40` }}
                  >
                    <Users className="w-4.5 h-4.5" style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="font-semibold">{c.name}</h4>
                      {!c.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Inactive</span>
                      )}
                      {!c.is_public && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Private</span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {c.member_count} member{c.member_count !== 1 ? 's' : ''}
                      </span>
                      {c.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" /> {tag}
                        </span>
                      ))}
                      {c.tags.length > 3 && <span className="text-xs text-muted-foreground">+{c.tags.length - 3} more</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedCommunity && (
          <div className="w-96 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col sticky top-4 self-start max-h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCommunity.color }} />
                <span className="text-sm font-semibold truncate">{selectedCommunity.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={openAddMembers}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
                >
                  <UserPlus className="w-3 h-3" /> Add
                </button>
                <button onClick={() => setSelectedCommunity(null)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-border flex-shrink-0">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Members', value: selectedCommunity.member_count },
                  { label: 'Public', value: selectedCommunity.is_public ? 'Yes' : 'No' },
                  { label: 'Status', value: selectedCommunity.is_active ? 'Active' : 'Inactive' },
                ].map(s => (
                  <div key={s.label} className="bg-secondary rounded-lg p-2">
                    <p className="text-sm font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {selectedCommunity.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCommunity.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                  <button onClick={openAddMembers} className="mt-2 text-xs text-primary hover:underline">Add members</button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2 px-4 py-3 hover:bg-secondary/30 group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{userInitials(m.profile || { full_name: null, username: null })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.profile?.full_name || m.profile?.username || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</p>
                      </div>
                      <select
                        value={m.role}
                        onChange={e => updateMemberRole(m.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:border-primary"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button
                        onClick={() => removeMember(m.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-transparent group-hover:text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Community' : 'New Community'}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal text-xs">(comma separated)</span></label>
            <input
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. beta, vip, healthcare"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-background ring-primary' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-7 h-7 rounded-full cursor-pointer border-none p-0"
                title="Custom color"
              />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} className="rounded" />
              Public
            </label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Create Community'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Community">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Delete <strong className="text-foreground">{deleteTarget?.name}</strong>? This will remove all {deleteTarget?.member_count} member associations. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </Modal>

      {addMemberOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setAddMemberOpen(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold">Add Members</h3>
                <p className="text-sm text-muted-foreground">{selectedCommunity?.name}</p>
              </div>
              <button onClick={() => setAddMemberOpen(false)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-border flex-shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Add as:</label>
                <select
                  value={bulkRole}
                  onChange={e => setBulkRole(e.target.value as 'member' | 'moderator')}
                  className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                </select>
                <span className="text-xs text-muted-foreground ml-auto">{selectedUserIds.size} selected</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {filteredUserOptions.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(u.id)}
                    onChange={() => toggleUserSelection(u.id)}
                    className="rounded"
                  />
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {(u.full_name || u.username || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || u.username || 'Unknown'}</p>
                    {u.username && u.full_name && <p className="text-xs text-muted-foreground truncate">{u.username}</p>}
                  </div>
                </label>
              ))}
              {filteredUserOptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No eligible users found.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border flex-shrink-0">
              <button onClick={() => setAddMemberOpen(false)} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
              <button
                onClick={addSelectedMembers}
                disabled={selectedUserIds.size === 0 || addingMembers}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {addingMembers ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add {selectedUserIds.size > 0 ? `${selectedUserIds.size} ` : ''}Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
