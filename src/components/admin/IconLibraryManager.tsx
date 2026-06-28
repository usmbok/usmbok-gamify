import { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon, Trash2, Loader, AlertCircle, Search,
  LayoutGrid, List, Upload, Layers, X, Pencil, Check, Tag,
  FolderOpen, Plus, Folder, FolderPlus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { IconPackUpload, type IconCategory } from './IconPackUpload';

interface IconItem {
  id: string;
  name: string;
  filename: string;
  storage_path: string;
  url: string;
  tags: string[];
  category_id: string | null;
  is_active: boolean;
  created_at: string;
}

type Tab = 'library' | 'import';
type ViewMode = 'grid' | 'list';

const LS_VIEW = 'admin_icon_library_view';
const LS_TAB = 'admin_icon_library_tab';

export function IconLibraryManager() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem(LS_TAB) as Tab) ?? 'library');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(LS_VIEW) as ViewMode) ?? 'grid');
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [categories, setCategories] = useState<IconCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<string | null>(null);

  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const changeTab = (t: Tab) => {
    setTab(t);
    localStorage.setItem(LS_TAB, t);
  };

  const changeViewMode = (m: ViewMode) => {
    setViewMode(m);
    localStorage.setItem(LS_VIEW, m);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    const [iconsRes, catsRes] = await Promise.all([
      supabase.from('icon_library_items').select('*').order('created_at', { ascending: false }),
      supabase.from('icon_categories').select('id, name').order('name'),
    ]);
    if (iconsRes.error) setError(iconsRes.error.message);
    setIcons(iconsRes.data ?? []);
    setCategories(catsRes.data ?? []);
    setLoading(false);
  };

  const startEdit = (icon: IconItem) => {
    setEditingId(icon.id);
    setEditName(icon.name);
    setEditTags(icon.tags.join(', '));
    setEditCategoryId(icon.category_id ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditTags('');
    setEditCategoryId('');
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean);
    const { error: err } = await supabase
      .from('icon_library_items')
      .update({ name: editName.trim(), tags, category_id: editCategoryId || null })
      .eq('id', id);
    if (!err) {
      setIcons((prev) => prev.map((ic) =>
        ic.id === id ? { ...ic, name: editName.trim(), tags, category_id: editCategoryId || null } : ic
      ));
      cancelEdit();
    }
    setSavingEdit(false);
  };

  const deleteIcon = async (icon: IconItem) => {
    setDeleting(icon.id);
    await supabase.storage.from('icon-library').remove([icon.storage_path]);
    await supabase.from('icon_library_items').delete().eq('id', icon.id);
    setIcons((prev) => prev.filter((ic) => ic.id !== icon.id));
    setDeleteConfirm(null);
    setDeleting(null);
  };

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const dup = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (dup) { setCategoryError(`"${dup.name}" already exists.`); return; }
    setSavingCategory(true);
    setCategoryError(null);
    const { data, error: err } = await supabase
      .from('icon_categories')
      .insert({ name, is_active: true, sort_order: 0 })
      .select('id, name')
      .single();
    if (err) { setCategoryError(err.message); }
    else if (data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCatName('');
      setAddingCategory(false);
    }
    setSavingCategory(false);
  };

  const deleteCategory = async (catId: string) => {
    setDeletingCategoryId(catId);
    await supabase.from('icon_categories').delete().eq('id', catId);
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    setIcons((prev) => prev.map((ic) => ic.category_id === catId ? { ...ic, category_id: null } : ic));
    if (selectedCategoryFilter === catId) setSelectedCategoryFilter(null);
    setDeleteCatConfirm(null);
    setDeletingCategoryId(null);
  };

  const filtered = icons.filter((ic) => {
    const matchesCat = selectedCategoryFilter === null
      ? true
      : selectedCategoryFilter === '__uncategorised'
        ? !ic.category_id
        : ic.category_id === selectedCategoryFilter;
    if (!matchesCat) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ic.name.toLowerCase().includes(q) || ic.tags.some((t) => t.toLowerCase().includes(q));
  });

  const countForCategory = (catId: string | null) =>
    icons.filter((ic) => catId === null ? true : catId === '__uncategorised' ? !ic.category_id : ic.category_id === catId).length;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'library', label: 'Icon Library', icon: ImageIcon },
    { id: 'import', label: 'Import Pack', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-bold">Icon Library</h3>
            <p className="text-sm text-muted-foreground">Upload and manage icons for challenges, quests, and pulses</p>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg border border-border">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'import' && (
        <IconPackUpload
          categories={categories}
          onPackImported={() => { changeTab('library'); loadAll(); }}
        />
      )}

      {tab === 'library' && (
        <div className="flex gap-4">
          <div className="w-48 flex-shrink-0 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</p>
              <button
                onClick={() => { setAddingCategory(true); setCategoryError(null); setNewCatName(''); }}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                title="Add category"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {addingCategory && (
              <div className="space-y-1.5 mb-2 p-2 bg-secondary rounded-lg border border-border">
                <input
                  autoFocus
                  type="text"
                  value={newCatName}
                  onChange={(e) => { setNewCatName(e.target.value); setCategoryError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCategory(false); }}
                  placeholder="Category name..."
                  className="w-full text-xs px-2 py-1.5 bg-card border border-border rounded focus:outline-none focus:border-primary"
                />
                {categoryError && <p className="text-[10px] text-red-500">{categoryError}</p>}
                <div className="flex gap-1">
                  <button
                    onClick={addCategory}
                    disabled={savingCategory || !newCatName.trim()}
                    className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {savingCategory ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Add
                  </button>
                  <button
                    onClick={() => setAddingCategory(false)}
                    className="flex-1 py-1 text-[11px] border border-border rounded text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedCategoryFilter(null)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategoryFilter === null
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                All icons
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategoryFilter === null ? 'bg-primary-foreground/20' : 'bg-border'}`}>
                {icons.length}
              </span>
            </button>

            {categories.map((cat) => (
              <div key={cat.id} className="group relative">
                {deleteCatConfirm === cat.id ? (
                  <div className="px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1.5">
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">Delete &quot;{cat.name}&quot;?</p>
                    <p className="text-[10px] text-muted-foreground">Icons will become uncategorised.</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        disabled={deletingCategoryId === cat.id}
                        className="flex-1 py-1 text-[11px] bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-60 transition-colors"
                      >
                        {deletingCategoryId === cat.id ? <Loader className="w-3 h-3 animate-spin mx-auto" /> : 'Delete'}
                      </button>
                      <button
                        onClick={() => setDeleteCatConfirm(null)}
                        className="flex-1 py-1 text-[11px] border border-border rounded text-muted-foreground hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategoryFilter === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategoryFilter === cat.id ? 'bg-primary-foreground/20' : 'bg-border'}`}>
                        {countForCategory(cat.id)}
                      </span>
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteCatConfirm(cat.id); }}
                        className={`p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                          selectedCategoryFilter === cat.id
                            ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                            : 'hover:bg-red-500/10 hover:text-red-500 text-muted-foreground'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setSelectedCategoryFilter('__uncategorised')}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategoryFilter === '__uncategorised'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 opacity-40" />
                Uncategorised
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategoryFilter === '__uncategorised' ? 'bg-primary-foreground/20' : 'bg-border'}`}>
                {countForCategory('__uncategorised')}
              </span>
            </button>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or tag..."
                  className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg border border-border">
                <button
                  onClick={() => changeViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => changeTab('import')}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{search ? 'No icons match your search' : 'No icons in this category'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search ? 'Try a different search term' : 'Import an icon pack to get started'}
                  </p>
                </div>
                {!search && (
                  <button
                    onClick={() => changeTab('import')}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Import Icons
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filtered.map((icon) => (
                  <GridCard
                    key={icon.id}
                    icon={icon}
                    categories={categories}
                    editingId={editingId}
                    editName={editName}
                    editTags={editTags}
                    editCategoryId={editCategoryId}
                    savingEdit={savingEdit}
                    deleteConfirm={deleteConfirm}
                    deleting={deleting}
                    editRef={editRef}
                    onStartEdit={startEdit}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={saveEdit}
                    onSetEditName={setEditName}
                    onSetEditTags={setEditTags}
                    onSetEditCategoryId={setEditCategoryId}
                    onSetDeleteConfirm={setDeleteConfirm}
                    onDelete={deleteIcon}
                  />
                ))}
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-14"></th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Tags</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((icon) => (
                      <ListRow
                        key={icon.id}
                        icon={icon}
                        categories={categories}
                        editingId={editingId}
                        editName={editName}
                        editTags={editTags}
                        editCategoryId={editCategoryId}
                        savingEdit={savingEdit}
                        deleteConfirm={deleteConfirm}
                        deleting={deleting}
                        editRef={editRef}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onSaveEdit={saveEdit}
                        onSetEditName={setEditName}
                        onSetEditTags={setEditTags}
                        onSetEditCategoryId={setEditCategoryId}
                        onSetDeleteConfirm={setDeleteConfirm}
                        onDelete={deleteIcon}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && icons.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                {filtered.length} of {icons.length} icon{icons.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  icon: IconItem;
  categories: IconCategory[];
  editingId: string | null;
  editName: string;
  editTags: string;
  editCategoryId: string;
  savingEdit: boolean;
  deleteConfirm: string | null;
  deleting: string | null;
  editRef: React.RefObject<HTMLInputElement>;
  onStartEdit: (icon: IconItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onSetEditName: (v: string) => void;
  onSetEditTags: (v: string) => void;
  onSetEditCategoryId: (v: string) => void;
  onSetDeleteConfirm: (id: string | null) => void;
  onDelete: (icon: IconItem) => void;
}

function GridCard({
  icon, categories, editingId, editName, editTags, editCategoryId, savingEdit,
  deleteConfirm, deleting, editRef,
  onStartEdit, onCancelEdit, onSaveEdit,
  onSetEditName, onSetEditTags, onSetEditCategoryId, onSetDeleteConfirm, onDelete,
}: CardProps) {
  const isEditing = editingId === icon.id;
  const isDeleteConfirm = deleteConfirm === icon.id;
  const isDeleting = deleting === icon.id;
  const catName = categories.find((c) => c.id === icon.category_id)?.name;

  return (
    <div className="group relative bg-secondary border border-border rounded-xl overflow-hidden flex flex-col transition-all hover:border-primary/40 hover:shadow-md">
      <div className="aspect-square p-3 flex items-center justify-center bg-card">
        <img
          src={icon.url}
          alt={icon.name}
          className="w-full h-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
        />
      </div>

      <div className="px-2.5 pb-2.5 pt-2 flex-1 flex flex-col gap-1.5">
        {isEditing ? (
          <div className="space-y-1.5">
            <input
              ref={editRef}
              type="text"
              value={editName}
              onChange={(e) => onSetEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(icon.id); if (e.key === 'Escape') onCancelEdit(); }}
              className="w-full text-xs px-2 py-1 bg-card border border-primary rounded focus:outline-none"
              placeholder="Icon name..."
            />
            <select
              value={editCategoryId}
              onChange={(e) => onSetEditCategoryId(e.target.value)}
              className="w-full text-xs px-2 py-1 bg-card border border-border rounded focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="text"
              value={editTags}
              onChange={(e) => onSetEditTags(e.target.value)}
              className="w-full text-xs px-2 py-1 bg-card border border-border rounded focus:outline-none focus:border-primary"
              placeholder="tag1, tag2..."
            />
            <div className="flex gap-1">
              <button
                onClick={() => onSaveEdit(icon.id)}
                disabled={savingEdit || !editName.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {savingEdit ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="flex-1 flex items-center justify-center gap-1 py-1 text-xs border border-border rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium truncate" title={icon.name}>{icon.name}</p>
            {catName && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full w-fit">
                <Folder className="w-2.5 h-2.5" />{catName}
              </span>
            )}
            {icon.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {icon.tags.slice(0, 2).map((t) => (
                  <span key={t} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                    <Tag className="w-2.5 h-2.5" />{t}
                  </span>
                ))}
                {icon.tags.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{icon.tags.length - 2}</span>
                )}
              </div>
            )}
            {isDeleteConfirm ? (
              <div className="flex gap-1 mt-auto">
                <button
                  onClick={() => onDelete(icon)}
                  disabled={isDeleting}
                  className="flex-1 py-1 text-[11px] bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => onSetDeleteConfirm(null)}
                  className="flex-1 py-1 text-[11px] border border-border rounded text-muted-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-1 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onStartEdit(icon)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] border border-border rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => onSetDeleteConfirm(icon.id)}
                  className="flex items-center justify-center p-1 border border-border rounded text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ListRow({
  icon, categories, editingId, editName, editTags, editCategoryId, savingEdit,
  deleteConfirm, deleting, editRef,
  onStartEdit, onCancelEdit, onSaveEdit,
  onSetEditName, onSetEditTags, onSetEditCategoryId, onSetDeleteConfirm, onDelete,
}: CardProps) {
  const isEditing = editingId === icon.id;
  const isDeleteConfirm = deleteConfirm === icon.id;
  const isDeleting = deleting === icon.id;
  const catName = categories.find((c) => c.id === icon.category_id)?.name;

  return (
    <tr className="hover:bg-secondary/50 transition-colors">
      <td className="px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden">
          <img src={icon.url} alt={icon.name} className="w-7 h-7 object-contain" />
        </div>
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            ref={editRef}
            type="text"
            value={editName}
            onChange={(e) => onSetEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSaveEdit(icon.id); if (e.key === 'Escape') onCancelEdit(); }}
            className="w-full text-sm px-2 py-1 bg-secondary border border-primary rounded focus:outline-none"
          />
        ) : (
          <span className="font-medium">{icon.name}</span>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {isEditing ? (
          <select
            value={editCategoryId}
            onChange={(e) => onSetEditCategoryId(e.target.value)}
            className="w-full text-sm px-2 py-1 bg-secondary border border-border rounded focus:outline-none focus:border-primary appearance-none"
          >
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : catName ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
            <Folder className="w-3 h-3" />{catName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {isEditing ? (
          <input
            type="text"
            value={editTags}
            onChange={(e) => onSetEditTags(e.target.value)}
            className="w-full text-sm px-2 py-1 bg-secondary border border-border rounded focus:outline-none focus:border-primary"
            placeholder="tag1, tag2..."
          />
        ) : (
          <div className="flex flex-wrap gap-1">
            {icon.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                <Tag className="w-3 h-3" />{t}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {isDeleteConfirm ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onDelete(icon)}
              disabled={isDeleting}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {isDeleting ? <Loader className="w-3 h-3 animate-spin" /> : 'Delete'}
            </button>
            <button
              onClick={() => onSetDeleteConfirm(null)}
              className="px-2 py-1 text-xs border border-border rounded text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onSaveEdit(icon.id)}
              disabled={savingEdit || !editName.trim()}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {savingEdit ? <Loader className="w-3 h-3 animate-spin" /> : 'Save'}
            </button>
            <button onClick={onCancelEdit} className="px-2 py-1 text-xs border border-border rounded text-muted-foreground hover:bg-accent transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onStartEdit(icon)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetDeleteConfirm(icon.id)}
              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
