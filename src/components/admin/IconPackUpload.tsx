import { useRef, useState, useEffect } from 'react';
import {
  Upload, X, Check, Loader, AlertCircle, FileArchive,
  Image as ImageIcon, Files, Layers, FolderOpen, Plus, Star, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface IconCategory {
  id: string;
  name: string;
}

interface IconPackUploadProps {
  categories: IconCategory[];
  onPackImported: () => void;
}

interface ZipEntry {
  filename: string;
  data: Uint8Array;
  mimeType: string;
}

interface ParsedIcon {
  filename: string;
  name: string;
  blob: Blob;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

type CategoryMode = 'existing' | 'new' | 'zip_name';

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

const ACCEPTED_IMAGE_EXTS = new Set(Object.keys(IMAGE_MIME));

function extOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function isImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_EXTS.has(extOf(file.name));
}

function filenameToName(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  const noExt = base.replace(/\.[^.]+$/, '');
  return noExt.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function zipStemToName(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  return base.replace(/\.zip$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

interface CentralDirEntry {
  filename: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

function findEndOfCentralDir(view: DataView): number {
  for (let i = view.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}

function parseCentralDirectory(buffer: ArrayBuffer): CentralDirEntry[] {
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDir(view);
  if (eocd < 0) return [];

  const totalEntries = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);

  const entries: CentralDirEntry[] = [];
  let pos = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buffer.byteLength) break;
    if (view.getUint32(pos, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const filenameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);
    const filename = new TextDecoder().decode(new Uint8Array(buffer, pos + 46, filenameLen));

    entries.push({ filename, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
    pos += 46 + filenameLen + extraLen + commentLen;
  }

  return entries;
}

function localFileDataOffset(buffer: ArrayBuffer, localHeaderOffset: number): number {
  const view = new DataView(buffer);
  const filenameLen = view.getUint16(localHeaderOffset + 26, true);
  const extraLen = view.getUint16(localHeaderOffset + 28, true);
  return localHeaderOffset + 30 + filenameLen + extraLen;
}

async function decompressDeflate(data: Uint8Array, uncompressedSize: number): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(data);
  writer.close();

  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(uncompressedSize || totalLength);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

async function parseZip(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  const cdEntries = parseCentralDirectory(buffer);
  const entries: ZipEntry[] = [];

  for (const entry of cdEntries) {
    const ext = extOf(entry.filename);
    const mimeType = IMAGE_MIME[ext];
    const isMeta =
      entry.filename.startsWith('__MACOSX') ||
      entry.filename.includes('/.') ||
      entry.filename.endsWith('.DS_Store') ||
      entry.filename.endsWith('/');

    if (!mimeType || isMeta) continue;

    const dataOffset = localFileDataOffset(buffer, entry.localHeaderOffset);

    try {
      const compressed = new Uint8Array(buffer, dataOffset, entry.compressedSize);
      let data: Uint8Array;

      if (entry.compressionMethod === 0) {
        data = new Uint8Array(compressed);
      } else if (entry.compressionMethod === 8) {
        data = await decompressDeflate(compressed, entry.uncompressedSize);
      } else {
        continue;
      }

      const shortName = entry.filename.split('/').pop() ?? entry.filename;
      entries.push({ filename: shortName, data, mimeType });
    } catch {
      // skip unreadable entries
    }
  }

  return entries;
}

async function filesToIcons(files: File[]): Promise<ParsedIcon[]> {
  return files.map((file) => {
    const blob = new Blob([file], { type: file.type || IMAGE_MIME[extOf(file.name)] || 'image/png' });
    return {
      filename: file.name,
      name: filenameToName(file.name),
      blob,
      previewUrl: URL.createObjectURL(blob),
      status: 'pending' as const,
    };
  });
}

async function zipToIcons(buffer: ArrayBuffer): Promise<ParsedIcon[]> {
  const entries = await parseZip(buffer);
  return entries.map((entry) => {
    const blob = new Blob([entry.data], { type: entry.mimeType });
    const shortName = entry.filename.split('/').pop() ?? entry.filename;
    return {
      filename: shortName,
      name: filenameToName(shortName),
      blob,
      previewUrl: URL.createObjectURL(blob),
      status: 'pending' as const,
    };
  });
}

export function IconPackUpload({ categories, onPackImported }: IconPackUploadProps) {
  const zipInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [icons, setIcons] = useState<ParsedIcon[]>([]);
  const [sourceLabel, setSourceLabel] = useState('');

  const [categoryMode, setCategoryMode] = useState<CategoryMode>('existing');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (categoryMode === 'zip_name' && sourceLabel) {
      setNewCategoryName(zipStemToName(sourceLabel));
    }
  }, [categoryMode, sourceLabel]);

  const validateNewCategoryName = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'Category name is required.';
    const dup = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (dup) return `A category named "${dup.name}" already exists.`;
    return null;
  };

  const applyIcons = (parsed: ParsedIcon[], label: string) => {
    if (parsed.length === 0) {
      setParseError('No supported image files found. Expected PNG, JPEG, SVG, or WebP.');
      return;
    }
    setIcons(parsed);
    setSourceLabel(label);
    setShowPanel(true);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    setParseError(null);
    setImportDone(false);
    setIcons([]);

    const items = Array.from(e.dataTransfer.files);
    const imageFiles = items.filter((f) => isImageFile(f));
    const zipFiles = items.filter((f) => f.name.endsWith('.zip'));

    if (imageFiles.length > 0) {
      const parsed = await filesToIcons(imageFiles);
      applyIcons(parsed, imageFiles.length === 1 ? imageFiles[0].name : `${imageFiles.length} images`);
      return;
    }

    if (zipFiles.length > 0) {
      try {
        const buffer = await zipFiles[0].arrayBuffer();
        const parsed = await zipToIcons(buffer);
        applyIcons(parsed, zipFiles[0].name);
      } catch {
        setParseError('Failed to read ZIP file. Ensure it is a valid, unencrypted ZIP.');
      }
      return;
    }

    setParseError('No supported files found. Drop image files (PNG, JPEG, SVG, WebP) or a ZIP.');
  };

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParseError(null);
    setImportDone(false);
    setIcons([]);
    try {
      const buffer = await file.arrayBuffer();
      applyIcons(await zipToIcons(buffer), file.name);
    } catch {
      setParseError('Failed to read ZIP file. Ensure it is a valid, unencrypted ZIP.');
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setParseError(null);
    setImportDone(false);
    setIcons([]);
    const valid = files.filter(isImageFile);
    applyIcons(await filesToIcons(valid), valid.length === 1 ? valid[0].name : `${valid.length} images`);
  };

  const removeIcon = (index: number) => {
    setIcons((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateName = (index: number, name: string) => {
    setIcons((prev) => prev.map((ic, i) => (i === index ? { ...ic, name } : ic)));
  };

  const resolveCategoryId = async (): Promise<{ id: string | null; error: string | null }> => {
    if (categoryMode === 'existing') {
      return { id: selectedCategoryId || null, error: null };
    }
    const name = newCategoryName.trim();
    const err = validateNewCategoryName(name);
    if (err) return { id: null, error: err };

    const { data, error } = await supabase
      .from('icon_categories')
      .insert({ name, is_active: true, sort_order: 0 })
      .select('id')
      .single();

    if (error || !data) return { id: null, error: error?.message ?? 'Failed to create category.' };
    return { id: data.id, error: null };
  };

  const handleImport = async () => {
    if (icons.length === 0) return;

    if (categoryMode === 'new' || categoryMode === 'zip_name') {
      const nameErr = validateNewCategoryName(newCategoryName);
      if (nameErr) { setNewCategoryError(nameErr); return; }
    }

    setNewCategoryError(null);
    setImporting(true);

    const { id: resolvedId, error: categoryError } = await resolveCategoryId();
    if (categoryError) {
      setNewCategoryError(categoryError);
      setImporting(false);
      return;
    }

    const updated = [...icons];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'uploading' };
      setIcons([...updated]);

      try {
        const iconId = crypto.randomUUID();
        const ext = extOf(updated[i].filename) || 'png';
        const storagePath = `${iconId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('icon-library')
          .upload(storagePath, updated[i].blob, { upsert: true, contentType: updated[i].blob.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('icon-library').getPublicUrl(storagePath);

        const payload: Record<string, unknown> = {
          id: iconId,
          name: updated[i].name,
          filename: updated[i].filename,
          storage_path: storagePath,
          url: publicUrl,
          tags: [],
          is_active: true,
        };
        if (resolvedId) payload.category_id = resolvedId;

        const { error: dbError } = await supabase.from('icon_library_items').insert(payload);
        if (dbError) throw dbError;

        updated[i] = { ...updated[i], status: 'done' };
      } catch (err: unknown) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          errorMsg: err instanceof Error ? err.message : 'Upload failed',
        };
      }

      setIcons([...updated]);
    }

    setImporting(false);
    setImportDone(true);
    onPackImported();
  };

  const reset = () => {
    icons.forEach((ic) => URL.revokeObjectURL(ic.previewUrl));
    setIcons([]);
    setImportDone(false);
    setParseError(null);
    setShowPanel(false);
    setSourceLabel('');
    setNewCategoryName('');
    setNewCategoryError(null);
    setCategoryMode('existing');
    setSelectedCategoryId('');
  };

  const doneCount = icons.filter((ic) => ic.status === 'done').length;
  const errorCount = icons.filter((ic) => ic.status === 'error').length;

  const categoryModes: Array<{ id: CategoryMode; label: string; icon: React.ReactNode }> = [
    { id: 'existing', label: 'Existing', icon: <FolderOpen className="w-3.5 h-3.5" /> },
    { id: 'new', label: 'Create new', icon: <Plus className="w-3.5 h-3.5" /> },
    { id: 'zip_name', label: 'Use source name', icon: <Star className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-lg">Import Icon Pack</h4>
        </div>
        {showPanel && (
          <button
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {!showPanel && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-xl border-2 border-dashed transition-all duration-200 select-none
              ${dragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border'}`}
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center">
              <Files className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Drop icon files here</p>
              <p className="text-xs text-muted-foreground mt-1">
                SVG, PNG, JPEG, WebP images &mdash; or a ZIP pack &mdash; single or multiple files
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Browse images
              </button>
              <button
                onClick={() => zipInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <FileArchive className="w-3.5 h-3.5" />
                Browse ZIP
              </button>
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleZipSelect}
            className="hidden"
          />
        </div>
      )}

      {parseError && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {parseError}
        </div>
      )}

      {showPanel && icons.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-secondary px-5 py-4 border-b border-border space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Destination Category</span>
              </div>

              <div className="flex gap-1 p-1 bg-background/60 rounded-lg w-fit border border-border">
                {categoryModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCategoryMode(m.id);
                      setNewCategoryError(null);
                      if (m.id === 'zip_name') {
                        setNewCategoryName(zipStemToName(sourceLabel));
                      }
                    }}
                    disabled={importing}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      categoryMode === m.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>

              {categoryMode === 'existing' && (
                <div className="relative">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 bg-card border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    disabled={importing}
                  >
                    <option value="">-- None (uncategorised) --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              )}

              {(categoryMode === 'new' || categoryMode === 'zip_name') && (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setNewCategoryError(validateNewCategoryName(e.target.value));
                    }}
                    placeholder="Category name..."
                    disabled={importing}
                    className={`w-full px-3 py-2 bg-card border rounded-lg text-sm focus:outline-none focus:ring-1 disabled:opacity-60 ${
                      newCategoryError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-border focus:border-primary focus:ring-primary'
                    }`}
                  />
                  {newCategoryError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {newCategoryError}
                    </p>
                  )}
                  {!newCategoryError && newCategoryName.trim() && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Will create &quot;{newCategoryName.trim()}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {icons.map((icon, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                  <img src={icon.previewUrl} alt={icon.name} className="w-full h-full object-contain p-0.5" />
                </div>

                <input
                  type="text"
                  value={icon.name}
                  onChange={(e) => updateName(i, e.target.value)}
                  disabled={icon.status !== 'pending' || importing}
                  className="flex-1 min-w-0 text-sm px-2 py-1.5 bg-secondary border border-border rounded-md focus:outline-none focus:border-primary disabled:opacity-60"
                />

                <div className="flex-shrink-0 flex items-center gap-2">
                  {icon.status === 'pending' && !importing && (
                    <button onClick={() => removeIcon(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {icon.status === 'uploading' && <Loader className="w-4 h-4 text-primary animate-spin" />}
                  {icon.status === 'done' && <Check className="w-4 h-4 text-green-500" />}
                  {icon.status === 'error' && (
                    <span className="text-xs text-red-500 flex items-center gap-1" title={icon.errorMsg}>
                      <AlertCircle className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-5 py-4 bg-secondary border-t border-border">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {icons.length} icon{icons.length !== 1 ? 's' : ''}
              {importDone && (
                <span className={`ml-2 ${errorCount > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                  &bull; {doneCount} imported{errorCount > 0 ? `, ${errorCount} failed` : ''}
                </span>
              )}
            </div>

            {!importDone ? (
              <button
                onClick={handleImport}
                disabled={
                  importing ||
                  icons.length === 0 ||
                  !!newCategoryError ||
                  ((categoryMode === 'new' || categoryMode === 'zip_name') && !newCategoryName.trim())
                }
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {importing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {icons.length} Icon{icons.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-secondary border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                <Layers className="w-4 h-4" />
                Import Another Pack
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
