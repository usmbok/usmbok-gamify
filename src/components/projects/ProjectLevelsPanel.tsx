import { useEffect, useState } from 'react';
import { Zap, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../admin/Modal';
import type { ProjectLevel } from '../../types/database';

interface Props { projectId: string; }

interface LevelForm {
  level_number: number;
  name: string;
  description: string;
  xp_required: number;
}

const emptyForm: LevelForm = { level_number: 1, name: '', description: '', xp_required: 0 };

const xpColors = ['text-slate-400', 'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-orange-500', 'text-red-500'];

export function ProjectLevelsPanel({ projectId }: Props) {
  const [levels, setLevels] = useState<ProjectLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectLevel | null>(null);
  const [form, setForm] = useState<LevelForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('project_levels')
      .select('*')
      .eq('project_id', projectId)
      .order('level_number');
    setLevels(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    const next = levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 1;
    setForm({ ...emptyForm, level_number: next });
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (l: ProjectLevel) => {
    setForm({ level_number: l.level_number, name: l.name, description: l.description || '', xp_required: l.xp_required });
    setEditTarget(l);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('project_levels').update({
          level_number: form.level_number, name: form.name, description: form.description, xp_required: form.xp_required
        }).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('project_levels').insert({
          project_id: projectId, level_number: form.level_number, name: form.name, description: form.description, xp_required: form.xp_required
        });
        if (err) throw err;
      }
      setModalOpen(false);
      await load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    await supabase.from('project_levels').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setSaving(false);
    await load();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-lg">Level Configuration</h4>
          <p className="text-sm text-muted-foreground">{levels.length} levels defined</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
          <Plus className="w-3.5 h-3.5" />Add Level
        </button>
      </div>

      {levels.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm mb-3">No levels configured for this project yet</p>
          <button onClick={openCreate} className="text-sm text-primary hover:underline">Add the first level</button>
        </div>
      ) : (
        <div className="space-y-2">
          {levels.map((l, idx) => (
            <div key={l.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-accent/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className={`font-bold text-base ${xpColors[idx % xpColors.length]}`}>{l.level_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{l.name}</p>
                {l.description && <p className="text-xs text-muted-foreground truncate">{l.description}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-orange-500">{l.xp_required.toLocaleString()} XP</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(l)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget(l)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Level' : 'Add Level'} size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Level #</label>
              <input type="number" min={1} value={form.level_number} onChange={e => setForm(f => ({ ...f, level_number: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Required</label>
              <input type="number" min={0} value={form.xp_required} onChange={e => setForm(f => ({ ...f, xp_required: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Initiate" className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Level" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Delete level <strong className="text-foreground">{deleteTarget?.name}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"><X className="w-4 h-4" />Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
