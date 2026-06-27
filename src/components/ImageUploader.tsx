import { useState, useRef, useCallback } from 'react';
import { Trash2, Loader2, ImageIcon, X, RefreshCw, Zap } from 'lucide-react';
import { uploadImage, deleteImage } from '@/services/imageService';
import { optimizeImage, type ImageInfo } from '@/services/imageOptimizer';
import toast from 'react-hot-toast';

interface ImageUploaderProps {
  /** Current image URL (R2 or external). Empty string = no image. */
  value: string;
  /** Called with the new URL after upload, or '' after deletion. */
  onChange: (url: string) => void;
  /** R2 sub-folder: 'logo' | 'banner' | 'menu' | 'categories' | 'offers' */
  folder: string;
  label?: string;
  hint?: string;
  aspectRatio?: 'square' | 'banner' | 'auto';
  disabled?: boolean;
}

// Accept up to 20 MB — optimizer handles compression
const MAX_BYTES  = 20 * 1024 * 1024;
const ALLOWED    = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

function validateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Unsupported format. Use JPG, PNG, WEBP, or AVIF.';
  if (file.size > MAX_BYTES) return `File too large (max 20 MB). Your file: ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  return null;
}

function fmtSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

interface StatsBarProps { original: ImageInfo; optimized: ImageInfo; savingPct: number }
function StatsBar({ original, optimized, savingPct }: StatsBarProps) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 mb-1.5 text-green-700 font-semibold">
        <Zap className="w-3.5 h-3.5" />
        Optimized — {savingPct}% smaller
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-600">
        <span className="text-gray-400">Original</span>
        <span className="text-gray-400">Optimized</span>
        <span>{original.width}×{original.height} · {fmtSize(original.sizeKB)}</span>
        <span className="text-green-700 font-medium">{optimized.width}×{optimized.height} · {fmtSize(optimized.sizeKB)}</span>
      </div>
    </div>
  );
}

export default function ImageUploader({
  value,
  onChange,
  folder,
  label,
  hint,
  aspectRatio = 'auto',
  disabled = false,
}: ImageUploaderProps) {
  const [stage, setStage]               = useState<'idle' | 'optimizing' | 'uploading'>('idle');
  const [progress, setProgress]         = useState(0);
  const [error, setError]               = useState('');
  const [dragOver, setDragOver]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [stats, setStats]               = useState<{ original: ImageInfo; optimized: ImageInfo; savingPct: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const validErr = validateFile(file);
    if (validErr) { setError(validErr); return; }
    setError('');
    setStats(null);

    try {
      // Step 1 — optimize in browser
      setStage('optimizing');
      const result = await optimizeImage(file, folder);
      setStats({ original: result.original, optimized: result.optimized, savingPct: result.savingPct });

      // Step 2 — upload to R2
      setStage('uploading');
      setProgress(0);
      const url = await uploadImage(result.file, folder, setProgress);
      onChange(url);
      toast.success('Image uploaded');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setStage('idle');
      setProgress(0);
    }
  }, [folder, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDeleteClick = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteImage(value);
      onChange('');
      setStats(null);
      toast.success('Image deleted');
    } catch {
      onChange('');
      setStats(null);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const busy            = stage !== 'idle';
  const previewHeight   = aspectRatio === 'banner' ? 'h-44' : aspectRatio === 'square' ? 'h-32 w-32' : 'h-40';
  const stageLabel      = stage === 'optimizing' ? 'Optimizing…' : `Uploading… ${progress}%`;
  const stageProgress   = stage === 'optimizing' ? null : progress;

  return (
    <div className={disabled ? 'opacity-60 pointer-events-none' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}

      {/* ── Empty upload zone ── */}
      {!value && !busy && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload image"
          className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className={`p-3 rounded-full transition-colors ${dragOver ? 'bg-primary-100' : 'bg-gray-100'}`}>
            <ImageIcon className={`w-6 h-6 ${dragOver ? 'text-primary-600' : 'text-gray-400'}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">
              {dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">JPG · PNG · WEBP · AVIF · Up to 20 MB · Auto-optimized</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleInputChange}
            className="hidden"
            capture={undefined}
          />
        </div>
      )}

      {/* ── Progress ── */}
      {busy && (
        <div className="border-2 border-dashed border-primary-300 bg-primary-50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">{stageLabel}</span>
          </div>
          <div className="w-full h-2 bg-primary-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${stageProgress === null ? 'bg-primary-300 animate-pulse w-full' : 'bg-primary-500'}`}
              style={stageProgress !== null ? { width: `${stageProgress}%` } : undefined}
            />
          </div>
          {stage === 'optimizing' && (
            <p className="text-xs text-gray-500 mt-2">Compressing & converting to WebP…</p>
          )}
        </div>
      )}

      {/* ── Preview ── */}
      {value && !busy && (
        <div className="space-y-2">
          <div className={`relative ${previewHeight} w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200`}>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";
              }}
            />
          </div>

          {/* Optimization stats (shown after fresh upload) */}
          {stats && <StatsBar {...stats} />}

          {/* Action buttons */}
          {!confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs text-red-700 flex-1">Delete this image permanently?</span>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-600 flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600" aria-label="Dismiss">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Hint ── */}
      {hint && !error && (
        <p className="text-xs text-gray-500 mt-1.5">{hint}</p>
      )}
    </div>
  );
}
