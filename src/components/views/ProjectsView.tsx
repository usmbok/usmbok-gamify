import { useEffect, useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  Check,
  X,
  Building2,
  Users,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../admin/Modal';
import { useAdmin } from '../../hooks/useAdmin';
import type { Project } from '../../types/database';

interface IndustrySector {
  id: string;
  name: string;
  code: string;
}

interface ProjectForm {
  name: string;
  description: string;
  client_name: string;
  industry_sector_id: string;
  status: 'draft' | 'active' | 'archived';
  color: string;
}

const emptyForm: ProjectForm = {
  name: '',
  description: '',
  client_name: '',
  industry_sector_id: '',
  status: 'draft',
  color: '#3B82F6',
};

const statusConfig = {
  active: { label: 'Active', classes: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  draft: { label: 'Draft', classes: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
  archived: { label: 'Archived', classes: 'bg-secondary text-muted-foreground border-border' },
};

const PRESET_COLORS = [
  '#0EA5E9', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F97316', '#6366F1',
];

interface ProjectsViewProps {
  onOpenProject: (project: Project) => void;
}

export function ProjectsView({ onOpenProject }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sectors, setSectors] = useState<IndustrySector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAdmin();
  const [projectCounts, setProjectCounts] = useState<Record<string, { quests: number; challenges: number; levels: number }>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [projRes, sectorRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*, industry_sector:industry_sectors(name, code)')
        .order('created_at', { ascending: false }),
      supabase
        .from('industry_sectors')
        .select('id, name, code')
        .is('parent_id', null)
        .order('name'),
    ]);
    const projs = projRes.data || [];
    setProjects(projs);
    setSectors(sectorRes.data || []);

    if (projs.length > 0) {
      const ids = projs.map(p => p.id);
      const [qRes, cRes, lRes] = await Promise.all([
        supabase.from('project_quests').select('project_id').in('project_id', ids),
        supabase.from('project_challenges').select('project_id').in('project_id', ids),
        supabase.from('project_levels').select('project_id').in('project_id', ids),
      ]);
      const counts: Record<string, { quests: number; challenges: number; levels: number }> = {};
      ids.forEach(id => { counts[id] = { quests: 0, challenges: 0, levels: 0 }; });
      (qRes.data || []).forEach(r => { if (counts[r.project_id]) counts[r.project_id].quests++; });
      (cRes.data || []).forEach(r => { if (counts[r.project_id]) counts[r.project_id].challenges++; });
      (lRes.data || []).forEach(r => { if (counts[r.project_id]) counts[r.project_id].levels++; });
      setProjectCounts(counts);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      name: p.name,
      description: p.description || '',
      client_name: p.client_name || '',
      industry_sector_id: p.industry_sector_id || '',
      status: p.status,
      color: p.color || '#3B82F6',
    });
    setEditTarget(p);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || null,
      client_name: form.client_name || null,
      industry_sector_id: form.industry_sector_id || null,
      status: form.status,
      color: form.color,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editTarget) {
        const { error: err } = await supabase.from('projects').update(payload).eq('id', editTarget.id);
        if (err) throw err;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error: err } = await supabase.from('projects').insert({
          ...payload,
          created_by: userData.user?.id || null,
        });
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
      await supabase.from('projects').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
          <FolderKanban className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold">Projects</h2>
            <p className="text-muted-foreground text-sm">Client and stakeholder gamification programs</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Projects</p>
          <p className="text-3xl font-bold">{projects.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">Active</p>
          <p className="text-3xl font-bold text-green-500">{projects.filter(p => p.status === 'active').length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">In Draft</p>
          <p className="text-3xl font-bold text-yellow-500">{projects.filter(p => p.status === 'draft').length}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(project => {
          const counts = projectCounts[project.id] || { quests: 0, challenges: 0, levels: 0 };
          const sc = statusConfig[project.status];
          return (
            <div
              key={project.id}
              onClick={() => onOpenProject(project)}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div
                className="h-2"
                style={{ backgroundColor: project.color || '#3B82F6' }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg truncate">{project.name}</h3>
                    </div>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${sc.classes}`}>
                      {sc.label}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={e => openEdit(project, e)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(project); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {project.client_name && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate">{project.client_name}</span>
                  </div>
                )}

                {project.industry_sector && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{project.industry_sector.name}</span>
                  </div>
                )}

                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                )}

                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    <span>{counts.levels} levels</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Target className="w-3 h-3" />
                    <span>{counts.quests} quests</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Trophy className="w-3 h-3" />
                    <span>{counts.challenges} challenges</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}

        {isAdmin && (
          <button
            onClick={openCreate}
            className="bg-card border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-accent/20 transition-all min-h-[200px] text-muted-foreground hover:text-primary"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Create New Project</span>
          </button>
        )}

        {filtered.length === 0 && !isAdmin && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No projects found{search ? ` matching "${search}"` : ''}</p>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Project' : 'Create Project'} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Project Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. TechCorp Employee Engagement"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client / Audience</label>
              <input
                type="text"
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                placeholder="e.g. TechCorp Inc."
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Industry Sector</label>
              <select
                value={form.industry_sector_id}
                onChange={e => setForm(f => ({ ...f, industry_sector_id: e.target.value }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select sector...</option>
                {sectors.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe the project goals and audience..."
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectForm['status'] }))}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Brand Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
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
              {editTarget ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Project">
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>? All associated levels, quests, challenges, and reward rules will be permanently removed.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <X className="w-4 h-4" />Delete Project
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
