import { useEffect, useState } from 'react';
import { Megaphone, Plus, Pencil, Trash2, X, AlertCircle, Clock, CheckCircle, Image as ImageIcon, ImagePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RichTextEditor } from '../ui/RichTextEditor';
import { ImageLibrary } from '../ui/ImageLibrary';

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  starts_at: string;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const TARGET_TYPES = [
  { value: 'all', label: 'All Players' },
  { value: 'quest', label: 'Quest Participants' },
  { value: 'challenge', label: 'Challenge Participants' },
  { value: 'project', label: 'Project Members' },
  { value: 'community', label: 'Community / Sector' },
];

const EMPTY: Partial<Announcement> = {
  title: '',
  body: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  target_type: 'all',
  target_id: null,
  target_label: '',
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: null,
  priority: 0,
  is_active: true,
};

function statusBadge(a: Announcement) {
  const now = new Date();
  const starts = new Date(a.starts_at);
  const ends = a.ends_at ? new Date(a.ends_at) : null;
  if (!a.is_active) return { label: 'Inactive', color: 'text-slate-500', bg: 'bg-slate-500/10' };
  if (starts > now) return { label: 'Scheduled', color: 'text-blue-500', bg: 'bg-blue-500/10' };
  if (ends && ends < now) return { label: 'Expired', color: 'text-red-500', bg: 'bg-red-500/10' };
  return { label: 'Live', color: 'text-green-500', bg: 'bg-green-500/10' };
}

export function AnnouncementsManager() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Partial<Announcement> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImageLibrary, setShowImageLibrary] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!modal) return;
    setSaving(true);
    setError(null);
    try {
      const { id, created_at, ...fields } = modal as Announcement;
      const payload = {
        ...fields,
        starts_at: fields.starts_at ? new Date(fields.starts_at).toISOString() : new Date().toISOString(),
        ends_at: fields.ends_at ? new Date(fields.ends_at).toISOString() : null,
        image_url: fields.image_url || null,
        cta_label: fields.cta_label || null,
        cta_url: fields.cta_url || null,
        target_label: fields.target_label || null,
        target_id: fields.target_id || null,
        body: fields.body || null,
        updated_at: new Date().toISOString(),
      };
      if (id) {
        const { error: e } = await supabase.from('announcements').update(payload).eq('id', id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('announcements').insert(payload);
        if (e) throw e;
      }
      setModal(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    await load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from('announcements').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  const field = (key: keyof Announcement, value: unknown) =>
    setModal(m => m ? { ...m, [key]: value } : m);

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Announcements</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Manage hero banner ads and announcements shown on the Dashboard</p>
        </div>
        <button
          onClick={() => { setModal({ ...EMPTY }); setError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Megaphone className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No announcements yet. Create one to display on the dashboard hero banner.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => {
            const status = statusBadge(a);
            const targetCfg = TARGET_TYPES.find(t => t.value === a.target_type);
            const bodyText = a.body ? stripHtml(a.body) : '';
            return (
              <div key={a.id} className="bg-card border border-border rounded-xl p-5 flex gap-4">
                {a.image_url ? (
                  <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                    <img
                      src={a.image_url}
                      alt={a.title}
                      className="w-full h-full object-cover"
                      onError={e => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label === 'Live' && <CheckCircle className="w-3 h-3" />}
                          {status.label === 'Scheduled' && <Clock className="w-3 h-3" />}
                          {status.label === 'Expired' && <X className="w-3 h-3" />}
                          {status.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{targetCfg?.label}</span>
                        {a.target_label && <span className="text-xs text-muted-foreground">— {a.target_label}</span>}
                        <span className="text-xs text-muted-foreground ml-auto">Priority {a.priority}</span>
                      </div>
                      <h4 className="font-semibold truncate">{a.title}</h4>
                      {bodyText && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{bodyText}</p>}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(a.starts_at).toLocaleDateString()}
                          {a.ends_at ? ` – ${new Date(a.ends_at).toLocaleDateString()}` : ' (no expiry)'}
                        </span>
                        {a.cta_label && <span className="text-primary font-medium">CTA: {a.cta_label}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggle(a.id, !a.is_active)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${a.is_active ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-secondary text-muted-foreground hover:bg-accent'}`}
                      >
                        {a.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button onClick={() => { setModal({ ...a }); setError(null); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(a.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setModal(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="text-lg font-bold">{(modal as Announcement).id ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                <input
                  value={modal.title || ''}
                  onChange={e => field('title', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Headline for the hero banner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Body Text</label>
                <RichTextEditor
                  value={modal.body || ''}
                  onChange={v => field('body', v)}
                  placeholder="Supporting description shown below the headline..."
                  minHeight={140}
                />
              </div>

              {/* Image section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Banner Image</label>
                <div className="flex gap-2">
                  <input
                    value={modal.image_url || ''}
                    onChange={e => field('image_url', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://... or pick from library"
                  />
                  <button
                    type="button"
                    onClick={() => setShowImageLibrary(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-lg text-sm hover:bg-accent transition-colors flex-shrink-0"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Library
                  </button>
                </div>
                {modal.image_url && (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden bg-secondary border border-border">
                    <img src={modal.image_url} alt="Preview" className="w-full h-full object-cover" onError={e => ((e.currentTarget as HTMLImageElement).style.opacity = '0')} />
                    <button
                      onClick={() => field('image_url', '')}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">CTA Button Label</label>
                  <input
                    value={modal.cta_label || ''}
                    onChange={e => field('cta_label', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Learn More"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">CTA Button URL</label>
                  <input
                    value={modal.cta_url || ''}
                    onChange={e => field('cta_url', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Audience</label>
                  <select
                    value={modal.target_type || 'all'}
                    onChange={e => field('target_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {TARGET_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Label (optional)</label>
                  <input
                    value={modal.target_label || ''}
                    onChange={e => field('target_label', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="e.g. Quest: Onboarding"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Starts At</label>
                  <input
                    type="datetime-local"
                    value={modal.starts_at ? modal.starts_at.slice(0, 16) : ''}
                    onChange={e => field('starts_at', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Expires At (optional)</label>
                  <input
                    type="datetime-local"
                    value={modal.ends_at ? modal.ends_at.slice(0, 16) : ''}
                    onChange={e => field('ends_at', e.target.value || null)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for no expiry.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Priority</label>
                  <input
                    type="number"
                    min={0}
                    value={modal.priority ?? 0}
                    onChange={e => field('priority', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">Higher = shown first</p>
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <input
                    type="checkbox"
                    id="is_active_ann"
                    checked={modal.is_active ?? true}
                    onChange={e => field('is_active', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="is_active_ann" className="text-sm font-medium cursor-pointer">Active</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !modal.title}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageLibrary && (
        <ImageLibrary
          selectedUrl={modal?.image_url || ''}
          onSelect={url => { field('image_url', url); setShowImageLibrary(false); }}
          onClose={() => setShowImageLibrary(false)}
        />
      )}
    </div>
  );
}
