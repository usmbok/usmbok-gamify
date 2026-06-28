import { useEffect, useState, useCallback } from 'react';
import {
  Package, Plus, Pencil, Trash2, Check, X, Search,
  DollarSign, Star, ToggleLeft, ToggleRight, GripVertical,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';

interface GiftPack {
  id: string;
  name: string;
  description: string | null;
  points: number;
  price_usd: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const emptyForm = {
  name: '',
  description: '',
  points: 100,
  price_usd: 9.99,
  is_active: true,
  display_order: 0,
};

export function GiftPacksManager() {
  const [packs, setPacks] = useState<GiftPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GiftPack | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GiftPack | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('gift_point_packs').select('*').order('display_order');
    setPacks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    const nextOrder = packs.length > 0 ? Math.max(...packs.map(p => p.display_order)) + 1 : 0;
    setForm({ ...emptyForm, display_order: nextOrder });
    setEditTarget(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (pack: GiftPack) => {
    setForm({
      name: pack.name,
      description: pack.description || '',
      points: pack.points,
      price_usd: pack.price_usd,
      is_active: pack.is_active,
      display_order: pack.display_order,
    });
    setEditTarget(pack);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError('Pack name is required.'); return; }
    if (form.points < 1) { setFormError('Points must be at least 1.'); return; }
    if (form.price_usd < 0) { setFormError('Price cannot be negative.'); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      points: form.points,
      price_usd: form.price_usd,
      is_active: form.is_active,
      display_order: form.display_order,
    };

    const { error } = editTarget
      ? await supabase.from('gift_point_packs').update(payload).eq('id', editTarget.id)
      : await supabase.from('gift_point_packs').insert(payload);

    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setModalOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('gift_point_packs').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    await load();
  };

  const toggleActive = async (pack: GiftPack) => {
    await supabase.from('gift_point_packs').update({ is_active: !pack.is_active }).eq('id', pack.id);
    await load();
  };

  const filtered = packs.filter(p =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenuePotential = packs.filter(p => p.is_active).reduce((s, p) => s + p.price_usd, 0);

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
        <h3 className="text-2xl font-bold">Gift Point Packs</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Pack
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Packs', value: packs.length, icon: Package, color: 'text-primary' },
          { label: 'Active Packs', value: packs.filter(p => p.is_active).length, icon: Star, color: 'text-green-500' },
          { label: 'Total Active Price', value: `$${totalRevenuePotential.toFixed(2)}`, icon: DollarSign, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <p className="text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search packs..."
          className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No gift packs found</p>
          </div>
        )}
        {filtered.map(pack => (
          <div key={pack.id} className={`border rounded-xl p-4 transition-colors ${pack.is_active ? 'border-border' : 'border-border/50 opacity-60'}`}>
            <div className="flex items-center gap-4">
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-semibold">{pack.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pack.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                    {pack.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {pack.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{pack.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <Star className="w-3 h-3" /> {pack.points.toLocaleString()} points
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                    <DollarSign className="w-3 h-3" /> ${pack.price_usd.toFixed(2)} USD
                  </span>
                  <span>Order: {pack.display_order}</span>
                  <span>≈ ${(pack.price_usd / pack.points * 100).toFixed(1)}¢ per 100 pts</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActive(pack)}
                  title={pack.is_active ? 'Deactivate' : 'Activate'}
                  className={`p-1.5 rounded-lg transition-colors ${pack.is_active ? 'hover:bg-red-500/10 text-green-500 hover:text-red-500' : 'hover:bg-green-500/10 text-muted-foreground hover:text-green-500'}`}
                >
                  {pack.is_active
                    ? <ToggleRight className="w-4 h-4" />
                    : <ToggleLeft className="w-4 h-4" />
                  }
                </button>
                <button
                  onClick={() => openEdit(pack)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(pack)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Gift Pack' : 'Create Gift Pack'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pack Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Starter Pack, Value Bundle..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Short description shown to buyers..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Points Included <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (USD) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price_usd}
                onChange={e => setForm(f => ({ ...f, price_usd: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display Order</label>
              <input
                type="number"
                min={0}
                value={form.display_order}
                onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Active</label>
              <button
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.is_active ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'bg-secondary border-border text-muted-foreground'
                }`}
              >
                {form.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {form.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>

          {form.points > 0 && form.price_usd > 0 && (
            <div className="bg-secondary rounded-lg px-3 py-2 text-xs text-muted-foreground">
              Value: ${(form.price_usd / form.points * 100).toFixed(2)}¢ per 100 points · ${(form.price_usd / form.points).toFixed(4)} per point
            </div>
          )}

          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {editTarget ? 'Save Changes' : 'Create Pack'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Gift Pack" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Delete <strong className="text-foreground">"{deleteTarget?.name}"</strong>? Users who have already purchased this pack will keep their points. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <X className="w-4 h-4" /> Delete Pack
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
