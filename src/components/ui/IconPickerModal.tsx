import { useState, useEffect, useRef } from 'react';
import {
  X, Search, Folder, FolderOpen, Image as ImageIcon,
  Loader, Check, Minus, Plus, ZoomIn, ZoomOut,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface IconItem {
  id: string;
  name: string;
  filename: string;
  url: string;
  tags: string[];
  category_id: string | null;
}

interface IconCategory {
  id: string;
  name: string;
}

export interface IconSelection {
  url: string;
  size: number;
}

interface IconPickerModalProps {
  onSelect: (selection: IconSelection) => void;
  onClose: () => void;
  currentUrl?: string | null;
  currentSize?: number;
}

const SIZE_PRESETS = [24, 32, 40, 48, 64, 80, 96];
const DEFAULT_SIZE = 40;

export function IconPickerModal({
  onSelect,
  onClose,
  currentUrl,
  currentSize = DEFAULT_SIZE,
}: IconPickerModalProps) {
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [categories, setCategories] = useState<IconCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(currentUrl ?? null);
  const [pendingSize, setPendingSize] = useState(currentSize);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [iconsRes, catsRes] = await Promise.all([
        supabase
          .from('icon_library_items')
          .select('id, name, filename, url, tags, category_id')
          .eq('is_active', true)
          .order('name'),
        supabase.from('icon_categories').select('id, name').order('name'),
      ]);
      setIcons(iconsRes.data ?? []);
      setCategories(catsRes.data ?? []);
      setLoading(false);
    };
    load();
    setTimeout(() => searchRef.current?.focus(), 80);
  }, []);

  const filtered = icons.filter((ic) => {
    const matchesCat =
      selectedCategory === null
        ? true
        : selectedCategory === '__uncategorised'
          ? !ic.category_id
          : ic.category_id === selectedCategory;

    if (!matchesCat) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ic.name.toLowerCase().includes(q) ||
      ic.filename.toLowerCase().includes(q) ||
      ic.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const countForCat = (catId: string | null) =>
    icons.filter((ic) =>
      catId === null
        ? true
        : catId === '__uncategorised'
          ? !ic.category_id
          : ic.category_id === catId
    ).length;

  const confirmSelection = () => {
    if (!pendingUrl) return;
    onSelect({ url: pendingUrl, size: pendingSize });
    onClose();
  };

  const adjustSize = (delta: number) => {
    setPendingSize((s) => Math.max(16, Math.min(128, s + delta)));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Choose Icon</h2>
            {icons.length > 0 && (
              <span className="text-xs text-muted-foreground">({icons.length} icons)</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-44 flex-shrink-0 border-r border-border overflow-y-auto py-2 px-1.5 space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">Categories</p>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                selectedCategory === null
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5" />All icons</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === null ? 'bg-primary-foreground/20' : 'bg-border'}`}>
                {icons.length}
              </span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${selectedCategory === cat.id ? 'bg-primary-foreground/20' : 'bg-border'}`}>
                  {countForCat(cat.id)}
                </span>
              </button>
            ))}

            <button
              onClick={() => setSelectedCategory('__uncategorised')}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                selectedCategory === '__uncategorised'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5 opacity-40" />Other</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === '__uncategorised' ? 'bg-primary-foreground/20' : 'bg-border'}`}>
                {countForCat('__uncategorised')}
              </span>
            </button>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, filename, or tag..."
                  className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {search ? `No icons matching "${search}"` : 'No icons in this category'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2">
                  {filtered.map((icon) => {
                    const isSelected = pendingUrl === icon.url;
                    return (
                      <button
                        key={icon.id}
                        onClick={() => setPendingUrl(icon.url)}
                        title={icon.name}
                        className={`relative group aspect-square rounded-xl flex items-center justify-center p-2 border-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-transparent hover:border-primary/40 hover:bg-accent bg-secondary'
                        }`}
                      >
                        <img
                          src={icon.url}
                          alt={icon.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                        />
                        {isSelected && (
                          <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 -bottom-px opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <p className="text-[9px] text-center text-foreground bg-card/90 backdrop-blur-sm rounded-b-xl px-1 py-0.5 truncate">{icon.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4 flex items-center gap-4 flex-shrink-0 bg-secondary/50">
          <div className="flex items-center gap-3 flex-1">
            {pendingUrl ? (
              <>
                <div
                  className="rounded-xl border-2 border-primary/40 bg-card flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ width: pendingSize + 16, height: pendingSize + 16 }}
                >
                  <img
                    src={pendingUrl}
                    alt="preview"
                    style={{ width: pendingSize, height: pendingSize }}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Size: {pendingSize}px</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => adjustSize(-8)}
                      disabled={pendingSize <= 16}
                      className="p-1 rounded border border-border bg-card hover:bg-accent transition-colors disabled:opacity-40"
                    >
                      <ZoomOut className="w-3 h-3" />
                    </button>
                    {SIZE_PRESETS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setPendingSize(s)}
                        className={`w-7 h-6 text-[10px] rounded border transition-colors ${
                          pendingSize === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-card hover:bg-accent text-muted-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      onClick={() => adjustSize(8)}
                      disabled={pendingSize >= 128}
                      className="p-1 rounded border border-border bg-card hover:bg-accent transition-colors disabled:opacity-40"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">No icon selected — click one above to preview</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentUrl && (
              <button
                onClick={() => { onSelect({ url: '', size: DEFAULT_SIZE }); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-red-500 hover:border-red-500/50 transition-colors"
              >
                <Minus className="w-4 h-4" />
                Remove
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmSelection}
              disabled={!pendingUrl}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              Use Icon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface IconPreviewButtonProps {
  iconUrl: string | null;
  iconSize: number;
  onOpen: () => void;
  onClear: () => void;
}

export function IconPreviewButton({ iconUrl, iconSize, onOpen, onClear }: IconPreviewButtonProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onOpen}
        className={`flex items-center justify-center rounded-xl border-2 border-dashed transition-all hover:border-primary/60 hover:bg-primary/5 ${
          iconUrl ? 'border-primary/40 bg-primary/5' : 'border-border'
        }`}
        style={{ width: 56, height: 56 }}
        title="Choose icon"
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt="icon"
            style={{ width: iconSize, height: iconSize }}
            className="object-contain"
          />
        ) : (
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        )}
      </button>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="text-xs text-primary hover:underline text-left"
        >
          {iconUrl ? 'Change icon' : 'Choose icon'}
        </button>
        {iconUrl && (
          <>
            <p className="text-[10px] text-muted-foreground">{iconSize}px display size</p>
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] text-red-500 hover:underline text-left"
            >
              Remove icon
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface UseIconPickerReturn {
  iconUrl: string | null;
  iconSize: number;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  handleSelect: (sel: IconSelection) => void;
  clearIcon: () => void;
}

export function useIconPicker(initialUrl: string | null = null, initialSize = DEFAULT_SIZE): UseIconPickerReturn {
  const [iconUrl, setIconUrl] = useState<string | null>(initialUrl);
  const [iconSize, setIconSize] = useState(initialSize);
  const [pickerOpen, setPickerOpen] = useState(false);

  const openPicker = () => setPickerOpen(true);
  const closePicker = () => setPickerOpen(false);

  const handleSelect = (sel: IconSelection) => {
    setIconUrl(sel.url || null);
    setIconSize(sel.size);
  };

  const clearIcon = () => {
    setIconUrl(null);
    setIconSize(DEFAULT_SIZE);
  };

  return { iconUrl, iconSize, pickerOpen, openPicker, closePicker, handleSelect, clearIcon };
}
