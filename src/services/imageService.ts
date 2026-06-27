import api from './api';

/**
 * Upload an image file to Cloudflare R2 via the /api/upload worker.
 *
 * @param file       - The File object from the file input / drag-drop
 * @param folder     - R2 sub-folder: 'logo' | 'banner' | 'menu' | 'categories' | 'offers'
 * @param onProgress - Optional callback with upload percentage 0-100
 * @returns          The public R2 URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  const response = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });

  const imageUrl = response.data?.imageUrl as string;
  if (!imageUrl) throw new Error('Upload succeeded but no URL returned');
  return imageUrl;
}

/**
 * Delete an image from Cloudflare R2 by its public URL.
 * Non-R2 URLs are silently skipped on the server (only clears from DB).
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;
  await api.delete('/upload', { data: { url: imageUrl } });
}
