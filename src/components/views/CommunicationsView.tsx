import { useEffect, useState } from 'react';
import { Mail, Plus, Pencil, Trash2, Send, Clock, CheckCircle, X, FileText, Calendar, Users, AlertCircle, Eye, LayoutGrid as Layout, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useViewPreference } from '../../hooks/useViewPreference';
import { ViewToggle } from '../ui/ViewToggle';
import { RichTextEditor } from '../ui/RichTextEditor';
import type { EmailTemplate, EmailSchedule } from '../../types/database';

type Tab = 'templates' | 'schedules' | 'footers';

interface EmailFooterTemplate {
  id: string;
  name: string;
  html_content: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-500/10', Icon: FileText },
  scheduled: { label: 'Scheduled', color: 'text-blue-500', bg: 'bg-blue-500/10', Icon: Clock },
  sending: { label: 'Sending', color: 'text-orange-500', bg: 'bg-orange-500/10', Icon: Send },
  sent: { label: 'Sent', color: 'text-green-500', bg: 'bg-green-500/10', Icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', Icon: X },
};

const templateTypeConfig: Record<string, { label: string; color: string }> = {
  general: { label: 'General', color: 'text-slate-500' },
  campaign: { label: 'Campaign', color: 'text-yellow-600' },
  quest: { label: 'Quest', color: 'text-blue-500' },
  challenge: { label: 'Challenge', color: 'text-teal-500' },
  announcement: { label: 'Announcement', color: 'text-orange-500' },
};

const recipientTypeOptions = [
  { value: 'all', label: 'All Players' },
  { value: 'active', label: 'Active Players (last 30 days)' },
  { value: 'inactive', label: 'Inactive Players' },
  { value: 'top_performers', label: 'Top Performers' },
  { value: 'level_segment', label: 'By Level Segment' },
];

const EMPTY_TEMPLATE: Partial<EmailTemplate> = {
  name: '',
  subject: '',
  body_html: '',
  body_text: '',
  template_type: 'general',
  is_active: true,
};

const EMPTY_SCHEDULE: Partial<EmailSchedule> = {
  name: '',
  template_id: null,
  recipient_type: 'all',
  subject_override: '',
  scheduled_at: null,
  send_immediately: false,
  status: 'draft',
  notes: '',
};

const EMPTY_FOOTER: Partial<EmailFooterTemplate> = {
  name: '',
  html_content: '',
  is_default: false,
  is_active: true,
};

export function CommunicationsView() {
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [footers, setFooters] = useState<EmailFooterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useViewPreference('communications', 'card');

  const [templateModal, setTemplateModal] = useState<Partial<EmailTemplate> | null>(null);
  const [scheduleModal, setScheduleModal] = useState<Partial<EmailSchedule> | null>(null);
  const [footerModal, setFooterModal] = useState<Partial<EmailFooterTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [tRes, sRes, fRes] = await Promise.all([
      supabase.from('email_templates').select('*').order('created_at', { ascending: false }),
      supabase.from('email_schedules').select('*, email_template:email_templates(*)').order('created_at', { ascending: false }),
      supabase.from('email_footer_templates').select('*').order('created_at', { ascending: false }),
    ]);
    setTemplates(tRes.data || []);
    setSchedules(sRes.data || []);
    setFooters(fRes.data || []);
    setLoading(false);
  };

  const saveTemplate = async () => {
    if (!templateModal) return;
    setSaving(true);
    setError(null);
    try {
      const { id, created_at, updated_at, created_by, ...fields } = templateModal as EmailTemplate;
      if (id) {
        const { error: err } = await supabase
          .from('email_templates')
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('email_templates').insert(fields);
        if (err) throw err;
      }
      setTemplateModal(null);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('email_templates').delete().eq('id', id);
    await loadAll();
  };

  const saveSchedule = async () => {
    if (!scheduleModal) return;
    setSaving(true);
    setError(null);
    try {
      const { id, created_at, updated_at, created_by, email_template, ...fields } = scheduleModal as EmailSchedule;
      const payload = { ...fields, subject_override: fields.subject_override || null };
      if (id) {
        const { error: err } = await supabase
          .from('email_schedules')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('email_schedules').insert(payload);
        if (err) throw err;
      }
      setScheduleModal(null);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Delete this scheduled send?')) return;
    await supabase.from('email_schedules').delete().eq('id', id);
    await loadAll();
  };

  const updateScheduleStatus = async (id: string, status: string) => {
    await supabase.from('email_schedules').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    await loadAll();
  };

  const saveFooter = async () => {
    if (!footerModal) return;
    setSaving(true);
    setError(null);
    try {
      const { id, created_at, created_by, ...fields } = footerModal as EmailFooterTemplate;
      if (fields.is_default) {
        await supabase.from('email_footer_templates').update({ is_default: false }).neq('id', id || '00000000-0000-0000-0000-000000000000');
      }
      if (id) {
        const { error: err } = await supabase.from('email_footer_templates').update(fields).eq('id', id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('email_footer_templates').insert(fields);
        if (err) throw err;
      }
      setFooterModal(null);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteFooter = async (id: string) => {
    if (!confirm('Delete this footer template?')) return;
    await supabase.from('email_footer_templates').delete().eq('id', id);
    await loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold">Communications</h2>
            <p className="text-sm text-muted-foreground">Email templates, schedules, and footer blocks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab !== 'footers' && <ViewToggle mode={viewMode} onChange={setViewMode} />}
          <button
            onClick={() => {
              if (tab === 'templates') setTemplateModal({ ...EMPTY_TEMPLATE });
              else if (tab === 'schedules') setScheduleModal({ ...EMPTY_SCHEDULE });
              else setFooterModal({ ...EMPTY_FOOTER });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {tab === 'templates' ? 'New Template' : tab === 'schedules' ? 'New Schedule' : 'New Footer'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
        {(['templates', 'schedules', 'footers'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'templates'
              ? `Templates (${templates.length})`
              : t === 'schedules'
              ? `Schedules (${schedules.length})`
              : `Footers (${footers.length})`}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <TemplatesPanel
          templates={templates}
          viewMode={viewMode}
          onEdit={t => setTemplateModal({ ...t })}
          onDelete={deleteTemplate}
          onPreview={t => setPreviewTemplate(t)}
        />
      )}

      {tab === 'schedules' && (
        <SchedulesPanel
          schedules={schedules}
          templates={templates}
          viewMode={viewMode}
          onEdit={s => setScheduleModal({ ...s })}
          onDelete={deleteSchedule}
          onStatusChange={updateScheduleStatus}
        />
      )}

      {tab === 'footers' && (
        <FootersPanel
          footers={footers}
          onEdit={f => setFooterModal({ ...f })}
          onDelete={deleteFooter}
        />
      )}

      {templateModal && (
        <TemplateModal
          data={templateModal}
          footers={footers}
          onChange={setTemplateModal}
          onSave={saveTemplate}
          onClose={() => { setTemplateModal(null); setError(null); }}
          saving={saving}
          error={error}
        />
      )}

      {scheduleModal && (
        <ScheduleModal
          data={scheduleModal}
          templates={templates}
          onChange={setScheduleModal}
          onSave={saveSchedule}
          onClose={() => { setScheduleModal(null); setError(null); }}
          saving={saving}
          error={error}
        />
      )}

      {footerModal && (
        <FooterModal
          data={footerModal}
          onChange={setFooterModal}
          onSave={saveFooter}
          onClose={() => { setFooterModal(null); setError(null); }}
          saving={saving}
          error={error}
        />
      )}

      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          footers={footers}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

function TemplatesPanel({
  templates,
  viewMode,
  onEdit,
  onDelete,
  onPreview,
}: {
  templates: EmailTemplate[];
  viewMode: 'card' | 'list';
  onEdit: (t: EmailTemplate) => void;
  onDelete: (id: string) => void;
  onPreview: (t: EmailTemplate) => void;
}) {
  if (templates.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-16 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No templates yet. Create your first email template.</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Subject</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Type</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Updated</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {templates.map(t => {
              const typeCfg = templateTypeConfig[t.template_type] || templateTypeConfig.general;
              return (
                <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{t.subject}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-medium ${typeCfg.color}`}>{typeCfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {new Date(t.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onPreview(t)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Preview"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => onEdit(t)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(t.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {templates.map(t => {
        const typeCfg = templateTypeConfig[t.template_type] || templateTypeConfig.general;
        return (
          <div key={t.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-semibold uppercase tracking-wider ${typeCfg.color}`}>{typeCfg.label}</span>
                <h4 className="font-semibold mt-0.5 truncate">{t.name}</h4>
              </div>
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                <button onClick={() => onPreview(t)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => onEdit(t)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(t.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate mb-3">{t.subject}</p>
            <div className="text-xs text-muted-foreground border-t border-border pt-2">
              Updated {new Date(t.updated_at).toLocaleDateString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SchedulesPanel({
  schedules,
  templates,
  viewMode,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  schedules: EmailSchedule[];
  templates: EmailTemplate[];
  viewMode: 'card' | 'list';
  onEdit: (s: EmailSchedule) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  if (schedules.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-16 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No scheduled sends yet. Create your first email schedule.</p>
      </div>
    );
  }

  const getTemplateName = (id: string | null) =>
    id ? templates.find(t => t.id === id)?.name ?? 'Unknown template' : 'No template';

  if (viewMode === 'list') {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Name</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Template</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Recipients</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Scheduled</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {schedules.map(s => {
              const sc = statusConfig[s.status] || statusConfig.draft;
              const SIcon = sc.Icon;
              return (
                <tr key={s.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[160px]">{getTemplateName(s.template_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">{s.recipient_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {s.send_immediately ? 'Ad hoc (immediate)' : s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${sc.bg} ${sc.color}`}>
                      <SIcon className="w-3 h-3" />{sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {s.status === 'draft' && (
                        <button onClick={() => onStatusChange(s.id, 'scheduled')} className="p-1.5 rounded hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500" title="Schedule"><Clock className="w-4 h-4" /></button>
                      )}
                      {s.status === 'scheduled' && (
                        <button onClick={() => onStatusChange(s.id, 'cancelled')} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Cancel"><X className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => onEdit(s)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(s.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {schedules.map(s => {
        const sc = statusConfig[s.status] || statusConfig.draft;
        const SIcon = sc.Icon;
        return (
          <div key={s.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold">{s.name}</h4>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${sc.bg} ${sc.color}`}>
                  <SIcon className="w-3 h-3" />{sc.label}
                </span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => onEdit(s)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(s.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{getTemplateName(s.template_id)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="capitalize">{s.recipient_type.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{s.send_immediately ? 'Ad hoc (immediate)' : s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : 'No date set'}</span>
              </div>
            </div>

            {s.status === 'draft' && (
              <button
                onClick={() => onStatusChange(s.id, 'scheduled')}
                className="mt-3 w-full py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
              >
                Confirm & Schedule
              </button>
            )}
            {s.status === 'scheduled' && (
              <button
                onClick={() => onStatusChange(s.id, 'cancelled')}
                className="mt-3 w-full py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
              >
                Cancel Schedule
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FootersPanel({
  footers,
  onEdit,
  onDelete,
}: {
  footers: EmailFooterTemplate[];
  onEdit: (f: EmailFooterTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (footers.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-16 text-center">
        <Layout className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No footer templates yet. Create a shared footer to reuse across email templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {footers.map(f => (
        <div key={f.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3 px-5 py-4">
            <Layout className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{f.name}</span>
                {f.is_default && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Default</span>
                )}
                {!f.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Inactive</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {new Date(f.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Preview"
              >
                {expandedId === f.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button onClick={() => onEdit(f)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => onDelete(f.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          {expandedId === f.id && (
            <div className="border-t border-border bg-white dark:bg-slate-900 p-4">
              <div
                className="prose prose-sm max-w-none dark:prose-invert text-xs"
                dangerouslySetInnerHTML={{ __html: f.html_content }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TemplateModal({
  data,
  footers,
  onChange,
  onSave,
  onClose,
  saving,
  error,
}: {
  data: Partial<EmailTemplate>;
  footers: EmailFooterTemplate[];
  onChange: (d: Partial<EmailTemplate>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  const field = (key: keyof EmailTemplate, value: unknown) =>
    onChange({ ...data, [key]: value });

  const activeFooters = footers.filter(f => f.is_active);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold">{(data as EmailTemplate).id ? 'Edit Template' : 'New Email Template'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Template Name</label>
              <input
                value={data.name || ''}
                onChange={e => field('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Campaign Launch Email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Template Type</label>
              <select
                value={data.template_type || 'general'}
                onChange={e => field('template_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.entries(templateTypeConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject Line</label>
            <input
              value={data.subject || ''}
              onChange={e => field('subject', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Your new quest is ready!"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Body</label>
            <p className="text-xs text-muted-foreground -mt-0.5">Use {'{{variable_name}}'} for personalization tokens. Toggle HTML view with the code button.</p>
            <RichTextEditor
              value={data.body_html || ''}
              onChange={val => field('body_html', val)}
              placeholder="<h1>Hello {{player_name}},</h1><p>Your quest awaits...</p>"
              minHeight={240}
              showHtmlToggle={true}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Plain Text Fallback <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              value={data.body_text || ''}
              onChange={e => field('body_text', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              placeholder="Plain text version for email clients that don't support HTML"
            />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-secondary/60 border-b border-border">
              <Layout className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Email Footer</span>
              <span className="text-xs text-muted-foreground ml-1">— shared footer block appended to every send</span>
            </div>
            <div className="p-4">
              {activeFooters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No footer templates defined yet. Create one under the Footers tab.</p>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Footer Template</label>
                  <select
                    value={(data as EmailTemplate & { footer_template_id?: string | null }).footer_template_id || ''}
                    onChange={e => onChange({ ...data, footer_template_id: e.target.value || null } as Partial<EmailTemplate>)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— No footer —</option>
                    {activeFooters.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name}{f.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                  {(data as EmailTemplate & { footer_template_id?: string | null }).footer_template_id && (() => {
                    const sel = activeFooters.find(f => f.id === (data as EmailTemplate & { footer_template_id?: string | null }).footer_template_id);
                    return sel ? (
                      <div className="mt-2 p-3 bg-secondary rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Preview</p>
                        <div
                          className="prose prose-xs max-w-none dark:prose-invert text-xs"
                          dangerouslySetInnerHTML={{ __html: sel.html_content }}
                        />
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.is_active ?? true}
              onChange={e => field('is_active', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Active (available for use in schedules)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={onSave}
            disabled={saving || !data.name || !data.subject}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FooterModal({
  data,
  onChange,
  onSave,
  onClose,
  saving,
  error,
}: {
  data: Partial<EmailFooterTemplate>;
  onChange: (d: Partial<EmailFooterTemplate>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">{(data as EmailFooterTemplate).id ? 'Edit Footer Template' : 'New Footer Template'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Footer Name</label>
            <input
              value={data.name || ''}
              onChange={e => onChange({ ...data, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Standard Branded Footer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Footer Content</label>
            <p className="text-xs text-muted-foreground -mt-0.5">Use {'{{unsubscribe_url}}'} and {'{{company_name}}'} as placeholders. Toggle HTML view with the code button.</p>
            <RichTextEditor
              value={data.html_content || ''}
              onChange={val => onChange({ ...data, html_content: val })}
              placeholder="Enter footer HTML content..."
              minHeight={180}
              showHtmlToggle={true}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.is_default ?? false}
                onChange={e => onChange({ ...data, is_default: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Set as default footer</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.is_active ?? true}
                onChange={e => onChange({ ...data, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={onSave}
            disabled={saving || !data.name}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Footer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({
  data,
  templates,
  onChange,
  onSave,
  onClose,
  saving,
  error,
}: {
  data: Partial<EmailSchedule>;
  templates: EmailTemplate[];
  onChange: (d: Partial<EmailSchedule>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  const field = (key: keyof EmailSchedule, value: unknown) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h3 className="text-lg font-bold">{(data as EmailSchedule).id ? 'Edit Schedule' : 'New Email Schedule'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Schedule Name</label>
            <input
              value={data.name || ''}
              onChange={e => field('name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. March Campaign Kickoff"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Template</label>
            <select
              value={data.template_id || ''}
              onChange={e => field('template_id', e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Select a template —</option>
              {templates.filter(t => t.is_active).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject Override <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              value={data.subject_override || ''}
              onChange={e => field('subject_override', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Leave blank to use template subject"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Recipients</label>
            <select
              value={data.recipient_type || 'all'}
              onChange={e => field('recipient_type', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {recipientTypeOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-semibold">Send Timing</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.send_immediately ?? false}
                onChange={e => field('send_immediately', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Send ad hoc (immediately when scheduled)</span>
            </label>

            {!data.send_immediately && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Scheduled Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={data.scheduled_at ? data.scheduled_at.slice(0, 16) : ''}
                  onChange={e => field('scheduled_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              value={data.notes || ''}
              onChange={e => field('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Internal notes about this send"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={onSave}
            disabled={saving || !data.name}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatePreviewModal({
  template: t,
  footers,
  onClose,
}: {
  template: EmailTemplate;
  footers: EmailFooterTemplate[];
  onClose: () => void;
}) {
  const footer = (t as EmailTemplate & { footer_template_id?: string | null }).footer_template_id
    ? footers.find(f => f.id === (t as EmailTemplate & { footer_template_id?: string | null }).footer_template_id)
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Preview</p>
            <h3 className="font-bold">{t.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 bg-secondary border-b border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Subject</p>
          <p className="font-medium text-sm">{t.subject}</p>
        </div>
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          <div className="p-4">
            {t.body_html ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: t.body_html }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">No HTML body content.</p>
            )}
          </div>
          {footer && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Footer: {footer.name}</p>
              <div
                className="prose prose-xs max-w-none dark:prose-invert text-xs"
                dangerouslySetInnerHTML={{ __html: footer.html_content }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
