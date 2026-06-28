import { useEffect, useState } from 'react';
import { Zap, Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';
import type { Level } from '../../types/database';

interface LevelForm {
  level_number: number;
  name: string;
  description: string;
  xp_required: number;
}

const emptyForm: LevelForm = { level_number: 1, name: '', description: '', xp_required: 0 };

export function LevelsManager() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Level | null>(null);
  const [form, setForm] = useState<LevelForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Level | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('levels').select('*').order('level_number');
    setLevels(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    const nextNum = levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 1;
    setForm({ ...emptyForm, level_number: nextNum });
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (level: Level) => {
    setForm({
      level_number: level.level_number,
      name: level.name,
      description: level.description || '',
      xp_required: level.xp_required,
    });
    setEditTarget(level);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      if (editTarget) {
        const { error: err } = await supabase
          .from('levels')
          .update({ level_number: form.level_number, name: form.name, description: form.description, xp_required: form.xp_required })
          .eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('levels')
          .insert({ level_number: form.level_number, name: form.name, description: form.description, xp_required: form.xp_required });
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
    try {
      await supabase.from('levels').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const xpColors = ['text-slate-500', 'text-blue-500', 'text-green-500', 'text-yellow-500', 'text-orange-500', 'text-red-500'];

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
        <h3 className="text-2xl font-bold">Level Configuration</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Level
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total Levels</span>
          </div>
          <p className="text-3xl font-bold">{levels.length}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChevronUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Max XP Required</span>
          </div>
          <p className="text-3xl font-bold">{levels.length > 0 ? Math.max(...levels.map(l => l.xp_required)).toLocaleString() : 0}</p>
        </div>
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChevronDown className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Entry Level XP</span>
          </div>
          <p className="text-3xl font-bold">{levels.length > 0 ? Math.min(...levels.map(l => l.xp_required)).toLocaleString() : 0}</p>
        </div>
      </div>

      <div className="space-y-3">
        {levels.map((level, idx) => (
          <div key={level.id} className="border border-border rounded-xl p-5 flex items-center gap-4 hover:bg-accent/20 transition-colors">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className={`text-lg font-bold ${xpColors[idx % xpColors.length]}`}>{level.level_number}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-foreground">{level.name}</h4>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">Level {level.level_number}</span>
              </div>
              {level.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{level.description}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold text-orange-500">{level.xp_required.toLocaleString()} XP</p>
              <p className="text-xs text-muted-foreground">required</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => openEdit(level)}
                className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(level)}
                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {levels.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No levels configured yet</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Level' : 'Add Level'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Level Number</label>
              <input
                type="number"
                min={1}
                value={form.level_number}
                onChange={e => setForm(f => ({ ...f, level_number: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP Required</label>
              <input
                type="number"
                min={0}
                value={form.xp_required}
                onChange={e => setForm(f => ({ ...f, xp_required: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Specialist"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Describe what this level represents..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Create Level'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Level"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
