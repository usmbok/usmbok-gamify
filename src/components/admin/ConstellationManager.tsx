import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Star, X, Check, Loader, AlertCircle, FolderOpen,
  LayoutGrid, List, ArrowLeft, ChevronDown, ArrowRightLeft, Image as ImageIcon,
  Lock, Award,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BadgeIconUpload } from './BadgeIconUpload';
import type { Badge, BadgeConstellation } from '../../types/database';

interface ConstellationManagerProps {
  constellations: BadgeConstellation[];
  onConstellationsChange: () => void;
}

interface ConstellationForm {
  name: string;
  description: string;
  theme: string;
  industry_sector: string;
  is_active: boolean;
  sort_order: number;
}

interface BadgeForm {
  name: string;
  description: string;
  points_reward: number;
  xp_reward: number;
  sequence_order: number;
  is_active: boolean;
}

const emptyConstellationForm: ConstellationForm = {
  name: '', description: '', theme: '', industry_sector: '', is_active: true, sort_order: 0,
};

const emptyBadgeForm: BadgeForm = {
  name: '', description: '', points_reward: 0, xp_reward: 0, sequence_order: 0, is_active: true,
};

type ViewMode = 'card' | 'list';

interface MoveState {
  badgeId: string;
  targetId: string;
  status: 'idle' | 'saving' | 'done' | 'error';
  error?: string;
}

const LS_SELECTED = 'admin_constellation_selected';
const LS_VIEW = 'admin_constellation_view';

export function ConstellationManager({ constellations, onConstellationsChange }: ConstellationManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(LS_SELECTED));
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(LS_VIEW) as ViewMode) ?? 'card');

  const [showConstellationModal, setShowConstellationModal] = useState(false);
  const [editingConstellationId, setEditingConstellationId] = useState<string | null>(null);
  const [constellationForm, setConstellationForm] = useState<ConstellationForm>(emptyConstellationForm);
  const [savingConstellation, setSavingConstellation] = useState(false);
  const [constellationError, setConstellationError] = useState<string | null>(null);
  const [confirmDeleteConstellationId, setConfirmDeleteConstellationId] = useState<string | null>(null);
  const [deletingConstellationId, setDeletingConstellationId] = useState<string | null>(null);

  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [badgeForm, setBadgeForm] = useState<BadgeForm>(emptyBadgeForm);
  const [savingBadge, setSavingBadge] = useState(false);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  const [confirmDeleteBadgeId, setConfirmDeleteBadgeId] = useState<string | null>(null);
  const [deletingBadgeId, setDeletingBadgeId] = useState<string | null>(null);

  const [moveState, setMoveState] = useState<MoveState | null>(null);

  const selectedConstellation = constellations.find((c) => c.id === selectedId) ?? null;

  const selectConstellation = (id: string | null) => {
    setSelectedId(id);
    if (id) localStorage.setItem(LS_SELECTED, id);
    else localStorage.removeItem(LS_SELECTED);
  };

  const changeViewMode = (m: ViewMode) => {
    setViewMode(m);
    localStorage.setItem(LS_VIEW, m);
  };

  useEffect(() => {
    if (selectedId) {
      const exists = constellations.some((c) => c.id === selectedId);
      if (!exists) { selectConstellation(null); return; }
      loadBadges(selectedId);
    } else {
      setBadges([]);
    }
  }, [selectedId, constellations]);

  const loadBadges = async (constellationId: string) => {
    setLoadingBadges(true);
    try {
      const { data } = await supabase
        .from('badges')
        .select('*')
        .eq('constellation_id', constellationId)
        .order('sequence_order');
      setBadges(data ?? []);
    } finally {
      setLoadingBadges(false);
    }
  };

  const validateConstellationName = (name: string, excludeId?: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'Name is required.';
    const dup = constellations.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== excludeId
    );
    if (dup) return `A constellation named "${dup.name}" already exists.`;
    return null;
  };

  const validateBadgeName = (name: string, excludeId?: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'Name is required.';
    const dup = badges.find(
      (b) => b.name.toLowerCase() === trimmed.toLowerCase() && b.id !== excludeId
    );
    if (dup) return `A badge named "${dup.name}" already exists in this constellation.`;
    return null;
  };

  const openCreateConstellation = () => {
    setEditingConstellationId(null);
    setConstellationForm({ ...emptyConstellationForm, sort_order: constellations.length });
    setConstellationError(null);
    setShowConstellationModal(true);
  };

  const openEditConstellation = (c: BadgeConstellation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConstellationId(c.id);
    setConstellationForm({
      name: c.name, description: c.description ?? '', theme: c.theme ?? '',
      industry_sector: c.industry_sector ?? '', is_active: c.is_active, sort_order: c.sort_order,
    });
    setConstellationError(null);
    setShowConstellationModal(true);
  };

  const saveConstellation = async () => {
    const nameErr = validateConstellationName(constellationForm.name, editingConstellationId ?? undefined);
    if (nameErr) { setConstellationError(nameErr); return; }
    setSavingConstellation(true);
    setConstellationError(null);
    try {
      const payload = {
        name: constellationForm.name.trim(),
        description: constellationForm.description.trim() || null,
        theme: constellationForm.theme.trim() || null,
        industry_sector: constellationForm.industry_sector.trim() || null,
        is_active: constellationForm.is_active,
        sort_order: constellationForm.sort_order,
      };
      if (editingConstellationId) {
        const { error } = await supabase.from('badge_constellations').update(payload).eq('id', editingConstellationId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('badge_constellations').insert({ ...payload, visual_data: {} });
        if (error) throw error;
      }
      onConstellationsChange();
      setShowConstellationModal(false);
    } catch (err: unknown) {
      setConstellationError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingConstellation(false);
    }
  };

  const deleteConstellation = async (id: string) => {
    setDeletingConstellationId(id);
    try {
      const { error } = await supabase.from('badge_constellations').delete().eq('id', id);
      if (error) throw error;
      if (selectedId === id) selectConstellation(null);
      onConstellationsChange();
    } finally {
      setDeletingConstellationId(null);
      setConfirmDeleteConstellationId(null);
    }
  };

  const openCreateBadge = () => {
    setEditingBadgeId(null);
    setBadgeForm({ ...emptyBadgeForm, sequence_order: badges.length + 1 });
    setBadgeError(null);
    setShowBadgeModal(true);
  };

  const openEditBadge = (badge: Badge) => {
    setEditingBadgeId(badge.id);
    setBadgeForm({
      name: badge.name, description: badge.description ?? '',
      points_reward: badge.points_reward, xp_reward: badge.xp_reward,
      sequence_order: badge.sequence_order, is_active: badge.is_active,
    });
    setBadgeError(null);
    setShowBadgeModal(true);
  };

  const saveBadge = async () => {
    const nameErr = validateBadgeName(badgeForm.name, editingBadgeId ?? undefined);
    if (nameErr) { setBadgeError(nameErr); return; }
    setSavingBadge(true);
    setBadgeError(null);
    try {
      const payload = {
        name: badgeForm.name.trim(),
        description: badgeForm.description.trim() || null,
        points_reward: badgeForm.points_reward,
        xp_reward: badgeForm.xp_reward,
        sequence_order: badgeForm.sequence_order,
        is_active: badgeForm.is_active,
        constellation_id: selectedId,
        achievement_criteria: {},
      };
      if (editingBadgeId) {
        const { error } = await supabase.from('badges').update(payload).eq('id', editingBadgeId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('badges').insert(payload);
        if (error) throw error;
      }
      if (selectedId) await loadBadges(selectedId);
      onConstellationsChange();
      setShowBadgeModal(false);
    } catch (err: unknown) {
      setBadgeError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingBadge(false);
    }
  };

  const deleteBadge = async (id: string) => {
    setDeletingBadgeId(id);
    try {
      const { error } = await supabase.from('badges').delete().eq('id', id);
      if (error) throw error;
      setBadges((prev) => prev.filter((b) => b.id !== id));
      onConstellationsChange();
    } finally {
      setDeletingBadgeId(null);
      setConfirmDeleteBadgeId(null);
    }
  };

  const startMove = (badge: Badge) => {
    setMoveState({ badgeId: badge.id, targetId: badge.constellation_id ?? '', status: 'idle' });
  };

  const commitMove = async () => {
    if (!moveState) return;
    setMoveState((m) => m ? { ...m, status: 'saving' } : m);
    const newId = moveState.targetId || null;
    const { error } = await supabase.from('badges').update({ constellation_id: newId }).eq('id', moveState.badgeId);
    if (error) {
      setMoveState((m) => m ? { ...m, status: 'error', error: error.message } : m);
      return;
    }
    setMoveState((m) => m ? { ...m, status: 'done' } : m);
    setTimeout(() => {
      setMoveState(null);
      if (selectedId) loadBadges(selectedId);
      onConstellationsChange();
    }, 700);
  };

  const handleIconUpdate = (badgeId: string, newUrl: string) => {
    setBadges((prev) => prev.map((b) => b.id === badgeId ? { ...b, icon_url: newUrl || null } : b));
    onConstellationsChange();
  };

  return (
    <div className="space-y-4">
      {!selectedId ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-lg">Constellations</h4>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {constellations.length}
              </span>
            </div>
            <button
              onClick={openCreateConstellation}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Constellation
            </button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            {constellations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No constellations yet. Create one to group badges.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Theme</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Sector</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {constellations.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => selectConstellation(c.id)}
                      className="hover:bg-accent/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <Star className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">{c.name}</p>
                            {c.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.theme ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.industry_sector ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => openEditConstellation(c, e)}
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteConstellationId === c.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteConstellation(c.id)}
                                disabled={deletingConstellationId === c.id}
                                className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              >
                                {deletingConstellationId === c.id
                                  ? <Loader className="w-3.5 h-3.5 animate-spin" />
                                  : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteConstellationId(null)}
                                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteConstellationId(c.id)}
                              className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <ConstellationBadgeView
          constellation={selectedConstellation}
          badges={badges}
          loading={loadingBadges}
          viewMode={viewMode}
          constellations={constellations}
          moveState={moveState}
          confirmDeleteBadgeId={confirmDeleteBadgeId}
          deletingBadgeId={deletingBadgeId}
          onBack={() => selectConstellation(null)}
          onSetViewMode={changeViewMode}
          onCreateBadge={openCreateBadge}
          onEditBadge={openEditBadge}
          onDeleteBadge={(id) => setConfirmDeleteBadgeId(id)}
          onConfirmDeleteBadge={deleteBadge}
          onCancelDeleteBadge={() => setConfirmDeleteBadgeId(null)}
          onStartMove={startMove}
          onMoveTargetChange={(id) => setMoveState((m) => m ? { ...m, targetId: id } : m)}
          onCommitMove={commitMove}
          onCancelMove={() => setMoveState(null)}
          onIconUpdate={handleIconUpdate}
          onEditConstellation={() => {
            if (!selectedConstellation) return;
            openEditConstellation(selectedConstellation, { stopPropagation: () => {} } as React.MouseEvent);
          }}
        />
      )}

      {showConstellationModal && (
        <ConstellationFormModal
          form={constellationForm}
          isEdit={!!editingConstellationId}
          saving={savingConstellation}
          error={constellationError}
          onFormChange={setConstellationForm}
          onSave={saveConstellation}
          onClose={() => setShowConstellationModal(false)}
        />
      )}

      {showBadgeModal && (
        <BadgeFormModal
          form={badgeForm}
          isEdit={!!editingBadgeId}
          saving={savingBadge}
          error={badgeError}
          onFormChange={setBadgeForm}
          onSave={saveBadge}
          onClose={() => setShowBadgeModal(false)}
        />
      )}
    </div>
  );
}

interface ConstellationBadgeViewProps {
  constellation: BadgeConstellation | null;
  badges: Badge[];
  loading: boolean;
  viewMode: ViewMode;
  constellations: BadgeConstellation[];
  moveState: MoveState | null;
  confirmDeleteBadgeId: string | null;
  deletingBadgeId: string | null;
  onBack: () => void;
  onSetViewMode: (m: ViewMode) => void;
  onCreateBadge: () => void;
  onEditBadge: (b: Badge) => void;
  onDeleteBadge: (id: string) => void;
  onConfirmDeleteBadge: (id: string) => void;
  onCancelDeleteBadge: () => void;
  onStartMove: (b: Badge) => void;
  onMoveTargetChange: (id: string) => void;
  onCommitMove: () => void;
  onCancelMove: () => void;
  onIconUpdate: (badgeId: string, url: string) => void;
  onEditConstellation: () => void;
}

function ConstellationBadgeView({
  constellation, badges, loading, viewMode, constellations, moveState,
  confirmDeleteBadgeId, deletingBadgeId,
  onBack, onSetViewMode, onCreateBadge, onEditBadge, onDeleteBadge,
  onConfirmDeleteBadge, onCancelDeleteBadge, onStartMove, onMoveTargetChange,
  onCommitMove, onCancelMove, onIconUpdate, onEditConstellation,
}: ConstellationBadgeViewProps) {
  const withIcons = badges.filter((b) => b.icon_url).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold leading-tight">{constellation?.name ?? 'Constellation'}</h4>
              <p className="text-xs text-muted-foreground">
                {badges.length} badge{badges.length !== 1 ? 's' : ''} &bull; {withIcons}/{badges.length} icons
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEditConstellation}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>

          <div className="flex items-center gap-0.5 p-0.5 bg-secondary rounded-lg border border-border">
            <button
              onClick={() => onSetViewMode('card')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Card view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onCreateBadge}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Badge
          </button>
        </div>
      </div>

      {constellation?.description && (
        <p className="text-sm text-muted-foreground">{constellation.description}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No badges in this constellation yet.</p>
          <button
            onClick={onCreateBadge}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Add the first badge
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              constellations={constellations}
              moveState={moveState?.badgeId === badge.id ? moveState : null}
              confirmDelete={confirmDeleteBadgeId === badge.id}
              deleting={deletingBadgeId === badge.id}
              onEdit={() => onEditBadge(badge)}
              onDelete={() => onDeleteBadge(badge.id)}
              onConfirmDelete={() => onConfirmDeleteBadge(badge.id)}
              onCancelDelete={onCancelDeleteBadge}
              onStartMove={() => onStartMove(badge)}
              onMoveTargetChange={onMoveTargetChange}
              onCommitMove={onCommitMove}
              onCancelMove={onCancelMove}
              onIconUpdate={onIconUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Badge</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Description</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Icon</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {badges.map((badge) => (
                <BadgeListRow
                  key={badge.id}
                  badge={badge}
                  constellations={constellations}
                  moveState={moveState?.badgeId === badge.id ? moveState : null}
                  confirmDelete={confirmDeleteBadgeId === badge.id}
                  deleting={deletingBadgeId === badge.id}
                  onEdit={() => onEditBadge(badge)}
                  onDelete={() => onDeleteBadge(badge.id)}
                  onConfirmDelete={() => onConfirmDeleteBadge(badge.id)}
                  onCancelDelete={onCancelDeleteBadge}
                  onStartMove={() => onStartMove(badge)}
                  onMoveTargetChange={onMoveTargetChange}
                  onCommitMove={onCommitMove}
                  onCancelMove={onCancelMove}
                  onIconUpdate={onIconUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface BadgeActionProps {
  badge: Badge;
  constellations: BadgeConstellation[];
  moveState: MoveState | null;
  confirmDelete: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onStartMove: () => void;
  onMoveTargetChange: (id: string) => void;
  onCommitMove: () => void;
  onCancelMove: () => void;
  onIconUpdate: (badgeId: string, url: string) => void;
}

function BadgeCard({ badge, constellations, moveState, confirmDelete, deleting, onEdit, onDelete, onConfirmDelete, onCancelDelete, onStartMove, onMoveTargetChange, onCommitMove, onCancelMove, onIconUpdate }: BadgeActionProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card hover:border-primary/40 transition-colors group">
      <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {badge.icon_url ? (
          <img src={badge.icon_url} alt={badge.name} className="w-full h-full object-contain p-3" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <Award className="w-10 h-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
          <BadgeIconUpload badgeId={badge.id} badgeName={badge.name} currentIconUrl={badge.icon_url} onUploadSuccess={onIconUpdate} />
        </div>
        {!badge.is_active && (
          <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/80 text-white font-medium">Off</span>
        )}
      </div>

      <div className="px-2.5 py-2">
        <p className="text-xs font-semibold truncate" title={badge.name}>{badge.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {badge.points_reward > 0 && <span className="text-[10px] text-yellow-500 font-medium">{badge.points_reward}p</span>}
          {badge.xp_reward > 0 && <span className="text-[10px] text-orange-500 font-medium">{badge.xp_reward}xp</span>}
          {badge.icon_url
            ? <span className="text-[10px] text-green-500 ml-auto"><ImageIcon className="w-3 h-3" /></span>
            : <span className="text-[10px] text-muted-foreground ml-auto"><Lock className="w-3 h-3" /></span>
          }
        </div>
      </div>

      <div className="px-2.5 pb-2 flex items-center gap-1">
        <button onClick={onEdit} className="flex-1 text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-1">
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button onClick={onStartMove} className="p-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Move">
          <ArrowRightLeft className="w-3 h-3" />
        </button>
        {confirmDelete ? (
          <>
            <button onClick={onConfirmDelete} disabled={deleting} className="p-1 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
              {deleting ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
            <button onClick={onCancelDelete} className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors">
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <button onClick={onDelete} className="p-1 rounded-md border border-border text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {moveState && (
        <div className="px-2.5 pb-2.5 border-t border-border pt-2 space-y-1.5">
          <div className="relative">
            <select
              value={moveState.targetId}
              onChange={(e) => onMoveTargetChange(e.target.value)}
              disabled={moveState.status !== 'idle'}
              className="w-full appearance-none text-[10px] px-2 py-1.5 pr-5 bg-secondary border border-border rounded-md focus:outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">Uncategorised</option>
              {constellations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="flex gap-1">
            {moveState.status === 'idle' && (
              <>
                <button onClick={onCommitMove} disabled={moveState.targetId === (badge.constellation_id ?? '')} className="flex-1 text-[10px] py-1 bg-primary text-primary-foreground rounded-md disabled:opacity-50 flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" /> Move
                </button>
                <button onClick={onCancelMove} className="text-[10px] px-2 py-1 border border-border rounded-md text-muted-foreground hover:bg-accent transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
            {moveState.status === 'saving' && <Loader className="w-3.5 h-3.5 text-primary animate-spin mx-auto" />}
            {moveState.status === 'done' && <span className="text-[10px] text-green-500 flex items-center gap-1 mx-auto"><Check className="w-3 h-3" /> Moved</span>}
            {moveState.status === 'error' && <span className="text-[10px] text-red-500">{moveState.error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeListRow({ badge, constellations, moveState, confirmDelete, deleting, onEdit, onDelete, onConfirmDelete, onCancelDelete, onStartMove, onMoveTargetChange, onCommitMove, onCancelMove, onIconUpdate }: BadgeActionProps) {
  return (
    <>
      <tr className="hover:bg-accent/20 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <BadgeIconUpload badgeId={badge.id} badgeName={badge.name} currentIconUrl={badge.icon_url} onUploadSuccess={onIconUpdate} />
            <div>
              <p className="font-medium text-sm">{badge.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {badge.points_reward > 0 && <span className="text-yellow-500">{badge.points_reward}p</span>}
                {badge.xp_reward > 0 && <span className="text-orange-500">{badge.xp_reward}xp</span>}
                <span>#{badge.sequence_order}</span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell max-w-xs">
          <span className="line-clamp-2">{badge.description ?? '—'}</span>
        </td>
        <td className="px-4 py-3 text-center">
          {badge.icon_url
            ? <span className="inline-flex items-center gap-1 text-xs text-green-500"><ImageIcon className="w-3.5 h-3.5" /></span>
            : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="w-3.5 h-3.5" /></span>
          }
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500'}`}>
            {badge.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={onStartMove} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Move"><ArrowRightLeft className="w-3.5 h-3.5" /></button>
            {confirmDelete ? (
              <>
                <button onClick={onConfirmDelete} disabled={deleting} className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                  {deleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={onCancelDelete} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </td>
      </tr>
      {moveState && (
        <tr className="bg-accent/30 border-b border-border">
          <td colSpan={5} className="px-4 py-2.5">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Move to:</span>
              <div className="relative max-w-xs flex-1">
                <select
                  value={moveState.targetId}
                  onChange={(e) => onMoveTargetChange(e.target.value)}
                  disabled={moveState.status !== 'idle'}
                  className="w-full appearance-none text-xs px-2.5 py-1.5 pr-7 bg-card border border-border rounded-md focus:outline-none focus:border-primary disabled:opacity-60"
                >
                  <option value="">Uncategorised</option>
                  {constellations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>
              {moveState.status === 'idle' && (
                <>
                  <button onClick={onCommitMove} disabled={moveState.targetId === (badge.constellation_id ?? '')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    <Check className="w-3 h-3" /> Move
                  </button>
                  <button onClick={onCancelMove} className="p-1.5 border border-border rounded-md text-muted-foreground hover:bg-accent transition-colors"><X className="w-3.5 h-3.5" /></button>
                </>
              )}
              {moveState.status === 'saving' && <Loader className="w-4 h-4 text-primary animate-spin" />}
              {moveState.status === 'done' && <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Moved</span>}
              {moveState.status === 'error' && <span className="text-xs text-red-500">{moveState.error}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface ConstellationFormModalProps {
  form: ConstellationForm;
  isEdit: boolean;
  saving: boolean;
  error: string | null;
  onFormChange: (f: ConstellationForm) => void;
  onSave: () => void;
  onClose: () => void;
}

function ConstellationFormModal({ form, isEdit, saving, error, onFormChange, onSave, onClose }: ConstellationFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-lg">{isEdit ? 'Edit Constellation' : 'New Constellation'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} placeholder="e.g. Leadership Mastery" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })} rows={3} placeholder="What this constellation is about..." className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Theme</label>
              <input type="text" value={form.theme} onChange={(e) => onFormChange({ ...form, theme: e.target.value })} placeholder="e.g. Innovation" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Industry Sector</label>
              <input type="text" value={form.industry_sector} onChange={(e) => onFormChange({ ...form, industry_sector: e.target.value })} placeholder="e.g. Technology" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={(e) => onFormChange({ ...form, sort_order: parseInt(e.target.value) || 0 })} min={0} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select value={form.is_active ? 'active' : 'inactive'} onChange={(e) => onFormChange({ ...form, is_active: e.target.value === 'active' })} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BadgeFormModalProps {
  form: BadgeForm;
  isEdit: boolean;
  saving: boolean;
  error: string | null;
  onFormChange: (f: BadgeForm) => void;
  onSave: () => void;
  onClose: () => void;
}

function BadgeFormModal({ form, isEdit, saving, error, onFormChange, onSave, onClose }: BadgeFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-lg">{isEdit ? 'Edit Badge' : 'New Badge'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} placeholder="e.g. Gold Contributor" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })} rows={3} placeholder="What earns this badge..." className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Points</label>
              <input type="number" value={form.points_reward} onChange={(e) => onFormChange({ ...form, points_reward: parseInt(e.target.value) || 0 })} min={0} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">XP</label>
              <input type="number" value={form.xp_reward} onChange={(e) => onFormChange({ ...form, xp_reward: parseInt(e.target.value) || 0 })} min={0} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Seq #</label>
              <input type="number" value={form.sequence_order} onChange={(e) => onFormChange({ ...form, sequence_order: parseInt(e.target.value) || 0 })} min={0} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <select value={form.is_active ? 'active' : 'inactive'} onChange={(e) => onFormChange({ ...form, is_active: e.target.value === 'active' })} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
