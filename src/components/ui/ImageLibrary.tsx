import { useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, X, Check, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LibraryImage {
  id: string;
  name: string;
  public_url: string;
  alt_text: string | null;
  file_size: number;
  mime_type: string | null;
  storage_path?: string;
  created_at: string;
}

interface ImageLibraryProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  selectedUrl?: string;
}

export function ImageLibrary({ onSelect, onClose, selectedUrl }: ImageLibraryProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('image_library')
      .select('*')
      .order('created_at', { ascending: false });
    setImages(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);

    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `uploads/${filename}`;

    try {
      const { error: uploadErr } = await supabase.storage
        .from('image-library')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('image-library').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: insertErr } = await supabase.from('image_library').insert({
        name: file.name,
        storage_path: path,
        public_url: publicUrl,
        mime_type: file.type,
        file_size: file.size,
      });

      if (insertErr) throw insertErr;

      await loadImages();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (img: LibraryImage) => {
    if (!confirm(`Delete "${img.name}"?`)) return;
    await supabase.storage.from('image-library').remove([img.storage_path ?? '']);
    await supabase.from('image_library').delete().eq('id', img.id);
    await loadImages();
  };

  const filtered = images.filter(img =>
    !search.trim() || img.name.toLowerCase().includes(search.toLowerCase())
  );

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">Image Library</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp,.gif,image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              onChange={handleUpload}
              className="hidden"
            />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search images..."
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {uploadError && (
            <p className="text-xs text-red-500 mt-2">{uploadError}</p>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search ? 'No images match your search.' : 'No images uploaded yet. Click "Upload Image" to add one.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map(img => {
                const isSelected = selectedUrl === img.public_url;
                return (
                  <div
                    key={img.id}
                    className={`group relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-primary shadow-md' : 'border-transparent hover:border-primary/40'
                    }`}
                    onClick={() => onSelect(img.public_url)}
                  >
                    <div className="aspect-square bg-secondary">
                      <img
                        src={img.public_url}
                        alt={img.alt_text || img.name}
                        className={`w-full h-full ${img.name.toLowerCase().endsWith('.svg') || img.mime_type === 'image/svg+xml' ? 'object-contain p-2' : 'object-cover'}`}
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src = '';
                          (e.currentTarget.parentElement as HTMLElement).innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground/40"><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' viewBox=\'0 0 24 24\'><rect x=\'3\' y=\'3\' width=\'18\' height=\'18\' rx=\'2\'/><circle cx=\'8.5\' cy=\'8.5\' r=\'1.5\'/><path d=\'m21 15-5-5L5 21\'/></svg></div>';
                        }}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                      <p className="text-white text-xs text-center leading-tight font-medium line-clamp-2">{img.name}</p>
                      <p className="text-white/70 text-xs">{fmtSize(img.file_size)}</p>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(img); }}
                        className="mt-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filtered.length} image{filtered.length !== 1 ? 's' : ''}</p>
          <button onClick={onClose} className="px-4 py-1.5 text-sm bg-secondary rounded-lg hover:bg-accent transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
