import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

interface BadgeIconUploadProps {
  badgeId: string;
  badgeName: string;
  currentIconUrl: string | null;
  onUploadSuccess: (badgeId: string, newUrl: string) => void;
}

export function BadgeIconUpload({ badgeId, badgeName, currentIconUrl, onUploadSuccess }: BadgeIconUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentIconUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload PNG, JPEG, SVG, or WebP.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'File too large. Maximum size is 2MB.';
    }
    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(false);
    setUploading(true);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const filename = `${badgeId}.${ext}`;

    const objectReader = new FileReader();
    objectReader.onload = (e) => setPreview(e.target?.result as string);
    objectReader.readAsDataURL(file);

    try {
      const { error: uploadError } = await supabase.storage
        .from('badge-icons')
        .upload(filename, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('badge-icons')
        .getPublicUrl(filename);

      const { error: dbError } = await supabase
        .from('badges')
        .update({ icon_url: publicUrl })
        .eq('id', badgeId);

      if (dbError) throw dbError;

      setSuccess(true);
      onUploadSuccess(badgeId, publicUrl);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(msg);
      setPreview(currentIconUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemove = async () => {
    setUploading(true);
    setError(null);
    try {
      await supabase
        .from('badges')
        .update({ icon_url: null })
        .eq('id', badgeId);
      setPreview(null);
      onUploadSuccess(badgeId, '');
    } catch {
      setError('Failed to remove icon.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative group flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none overflow-hidden
          ${dragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border hover:border-primary/60 hover:bg-accent/40'}
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
        style={{ width: 80, height: 80 }}
      >
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {preview ? (
          <>
            <img
              src={preview}
              alt={badgeName}
              className="w-full h-full object-contain p-1"
              onError={() => setPreview(null)}
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
            <ImageIcon className="w-7 h-7" />
            <span className="text-[10px] font-medium text-center leading-tight px-1">Upload Icon</span>
          </div>
        )}
      </div>

      {preview && !uploading && (
        <button
          onClick={(e) => { e.stopPropagation(); handleRemove(); }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
        >
          <X className="w-3 h-3" />
          Remove
        </button>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 text-xs text-green-500">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Saved</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
