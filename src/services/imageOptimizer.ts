import imageCompression from 'browser-image-compression';

export interface ImageInfo {
  name:     string;
  width:    number;
  height:   number;
  sizeKB:   number;
}

export interface OptimizedResult {
  file:      File;
  original:  ImageInfo;
  optimized: ImageInfo;
  savingPct: number;
}

/** Read width/height from a File without uploading */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }); };
    img.src = url;
  });
}

const FOLDER_LIMITS: Record<string, { maxWidthOrHeight: number; quality: number }> = {
  logo:       { maxWidthOrHeight: 400,  quality: 0.90 },
  banner:     { maxWidthOrHeight: 1600, quality: 0.85 },
  menu:       { maxWidthOrHeight: 1200, quality: 0.85 },
  categories: { maxWidthOrHeight: 800,  quality: 0.85 },
  offers:     { maxWidthOrHeight: 1200, quality: 0.85 },
  default:    { maxWidthOrHeight: 1200, quality: 0.85 },
};

/**
 * Compress + resize image client-side before uploading to R2.
 * Converts to WebP when the browser supports it (reduces size ~30-50% further).
 */
export async function optimizeImage(file: File, folder: string): Promise<OptimizedResult> {
  const dims = await getImageDimensions(file);
  const originalInfo: ImageInfo = {
    name:   file.name,
    width:  dims.width,
    height: dims.height,
    sizeKB: Math.round(file.size / 1024),
  };

  const cfg = FOLDER_LIMITS[folder] ?? FOLDER_LIMITS.default;

  const compressed = await imageCompression(file, {
    maxSizeMB:         10,          // allow up to 10 MB input
    maxWidthOrHeight:  cfg.maxWidthOrHeight,
    initialQuality:    cfg.quality,
    useWebWorker:      true,
    fileType:          'image/webp', // always output WebP
    alwaysKeepResolution: false,
    preserveExif:      false,        // strip metadata
  });

  const optDims = await getImageDimensions(compressed);
  const optimizedInfo: ImageInfo = {
    name:   compressed.name,
    width:  optDims.width,
    height: optDims.height,
    sizeKB: Math.round(compressed.size / 1024),
  };

  const savingPct = Math.max(
    0,
    Math.round(((file.size - compressed.size) / file.size) * 100)
  );

  // Rename to .webp
  const ext    = '.webp';
  const base   = file.name.replace(/\.[^.]+$/, '');
  const renamed = new File([compressed], base + ext, { type: 'image/webp' });

  return { file: renamed, original: originalInfo, optimized: optimizedInfo, savingPct };
}
