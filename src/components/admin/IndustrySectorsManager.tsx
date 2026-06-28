import { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Users,
  Upload,
  GitBranch,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';

interface IndustrySector {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  level: number;
  is_active: boolean;
}

interface SectorRole {
  id: string;
  sector_id: string;
  name: string;
  description: string | null;
}

const LEVEL_LABELS: Record<number, string> = { 1: 'L1', 2: 'L2', 3: 'L3' };
const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  2: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  3: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const emptyForm = {
  code: '',
  name: '',
  description: '',
  parent_id: null as string | null,
  level: 1,
  is_active: true,
};

export function IndustrySectorsManager() {
  const [sectors, setSectors] = useState<IndustrySector[]>([]);
  const [roles, setRoles] = useState<SectorRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [sectorModal, setSectorModal] = useState(false);
  const [editingItem, setEditingItem] = useState<IndustrySector | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [rolesModal, setRolesModal] = useState(false);
  const [rolesSector, setRolesSector] = useState<IndustrySector | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [sRes, rRes] = await Promise.all([
      supabase.from('industry_sectors').select('*').order('level').order('name'),
      supabase.from('sector_roles').select('*').order('name'),
    ]);
    setSectors(sRes.data || []);
    setRoles(rRes.data || []);
    setLoading(false);
  };

  const childrenOf = useMemo(() => {
    const map: Record<string, IndustrySector[]> = {};
    for (const s of sectors) {
      const key = s.parent_id ?? '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sectors]);

  const rolesOf = useMemo(() => {
    const map: Record<string, SectorRole[]> = {};
    for (const r of roles) {
      if (!map[r.sector_id]) map[r.sector_id] = [];
      map[r.sector_id].push(r);
    }
    return map;
  }, [roles]);

  const filteredL1 = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return childrenOf['__root__'] || [];
    return sectors.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [search, childrenOf, sectors]);

  const totalCount = sectors.length;
  const l1Count = sectors.filter(s => s.level === 1).length;

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId: string | null = null, level = 1) => {
    setEditingItem(null);
    setFormData({ ...emptyForm, parent_id: parentId, level });
    setSectorModal(true);
  };

  const openEdit = (item: IndustrySector) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      parent_id: item.parent_id,
      level: item.level,
      is_active: item.is_active,
    });
    setSectorModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    if (editingItem) {
      await supabase.from('industry_sectors').update(formData).eq('id', editingItem.id);
    } else {
      await supabase.from('industry_sectors').insert(formData);
    }
    setSaving(false);
    setSectorModal(false);
    loadAll();
  };

  const handleDelete = async (item: IndustrySector) => {
    const childCount = (childrenOf[item.id] || []).length;
    const msg = childCount > 0
      ? `Delete "${item.name}" and its ${childCount} child sector(s)?`
      : `Delete "${item.name}"?`;
    if (!confirm(msg)) return;
    await supabase.from('industry_sectors').delete().eq('id', item.id);
    loadAll();
  };

  const openRoles = (sector: IndustrySector) => {
    setRolesSector(sector);
    setNewRoleName('');
    setNewRoleDesc('');
    setRolesModal(true);
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !rolesSector) return;
    setAddingRole(true);
    await supabase.from('sector_roles').insert({
      sector_id: rolesSector.id,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || null,
    });
    setNewRoleName('');
    setNewRoleDesc('');
    setAddingRole(false);
    loadAll();
  };

  const handleDeleteRole = async (roleId: string) => {
    await supabase.from('sector_roles').delete().eq('id', roleId);
    loadAll();
  };

  const renderRow = (sector: IndustrySector, depth = 0): React.ReactNode => {
    const children = childrenOf[sector.id] || [];
    const isExpanded = expanded.has(sector.id);
    const sectorRoles = rolesOf[sector.id] || [];
    const hasChildren = children.length > 0;

    return [
      <tr
        key={sector.id}
        className="border-b border-border hover:bg-secondary/40 transition-colors group"
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(sector.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-4 flex-shrink-0 flex items-center justify-center">
                {depth > 0 && (
                  <span className="text-muted-foreground text-xs">└</span>
                )}
              </span>
            )}
            <span className={`font-medium ${depth === 0 ? 'text-foreground' : 'text-foreground/80'}`}>
              {sector.name}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${LEVEL_COLORS[sector.level] || ''}`}>
            {LEVEL_LABELS[sector.level] ?? `L${sector.level}`}
          </span>
        </td>
        <td className="py-3 px-4 text-muted-foreground text-sm">
          {children.length > 0 ? children.length : <span className="text-muted-foreground/50">—</span>}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button
              onClick={() => openRoles(sector)}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Manage Roles"
            >
              <Users className="w-4 h-4" />
            </button>
            {sector.level < 3 && (
              <button
                onClick={() => openCreate(sector.id, sector.level + 1)}
                className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Add Child Sector"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => openEdit(sector)}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(sector)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>,
      ...(isExpanded ? children.flatMap(child => renderRow(child, depth + 1)) : []),
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary" />
          <div>
            <h3 className="text-2xl font-bold">Industry Sectors</h3>
            <p className="text-sm text-muted-foreground">Manage the industry sector catalog</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm transition-colors"
            title="Role Taxonomy"
          >
            <GitBranch className="w-4 h-4" />
            Role Taxonomy
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-accent border border-border rounded-lg text-sm transition-colors"
            title="Import"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sector
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search sectors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Stats */}
      <p className="text-sm text-muted-foreground">
        {l1Count} top-level sector{l1Count !== 1 ? 's' : ''} · {totalCount} total
      </p>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary/50 border-b border-border">
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Sector Name</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground w-20">Level</th>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground w-24">Children</th>
              <th className="py-3 px-4 w-36" />
            </tr>
          </thead>
          <tbody>
            {filteredL1.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-muted-foreground">
                  {search ? 'No sectors match your search.' : 'No sectors yet. Click "+ New Sector" to add one.'}
                </td>
              </tr>
            ) : (
              filteredL1.flatMap(s => renderRow(s))
            )}
          </tbody>
        </table>
      </div>

      {/* Sector Modal */}
      <Modal
        isOpen={sectorModal}
        onClose={() => setSectorModal(false)}
        title={editingItem ? 'Edit Industry Sector' : 'New Industry Sector'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g., Healthcare and Medical"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Level</label>
            <input
              type="number"
              min={1}
              max={3}
              value={formData.level}
              onChange={e => {
                const lv = Math.max(1, Math.min(3, parseInt(e.target.value) || 1));
                setFormData({ ...formData, level: lv, parent_id: lv === 1 ? null : formData.parent_id });
              }}
              className="w-24 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {formData.level > 1 && (
            <div>
              <label className="block text-sm font-medium mb-1">Parent Sector</label>
              <select
                value={formData.parent_id || ''}
                onChange={e => setFormData({ ...formData, parent_id: e.target.value || null })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select parent...</option>
                {sectors
                  .filter(s => s.level === formData.level - 1)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_sector"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="is_active_sector" className="text-sm">Active</label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
            <button
              onClick={() => setSectorModal(false)}
              className="px-4 py-2 bg-secondary rounded-lg hover:bg-accent text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Roles Modal */}
      {rolesModal && rolesSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRolesModal(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Roles</h3>
              </div>
              <button
                onClick={() => setRolesModal(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Roles associated with <strong className="text-foreground">{rolesSector.name}</strong>
              </p>

              <div className="border border-border rounded-lg overflow-hidden">
                {(rolesOf[rolesSector.id] || []).length === 0 ? (
                  <p className="p-4 text-sm text-center text-muted-foreground">
                    No roles associated with this sector yet.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {(rolesOf[rolesSector.id] || []).map(role => (
                      <div key={role.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50">
                        <div>
                          <p className="text-sm font-medium">{role.name}</p>
                          {role.description && (
                            <p className="text-xs text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Quick Add Role</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                    placeholder="Role name"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleAddRole}
                    disabled={!newRoleName.trim() || addingRole}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Role
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
