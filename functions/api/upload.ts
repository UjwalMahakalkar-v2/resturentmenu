import { getTenantIdFromRequest } from '../utils/jwt';
import { getDB, queryFirst } from '../db';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── POST /api/upload  ──────────────────────────────────────────────────────────
// Body: multipart/form-data  { file: File, folder: 'logo'|'banner'|'menu'|'categories'|... }
// Returns: { imageUrl: string, key: string }
export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db      = getDB(context.env);

    // Resolve tenant slug for folder isolation
    const tenant = await queryFirst(db, 'SELECT slug FROM tenants WHERE id = ?', tenantId);
    if (!tenant) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });

    const formData = await context.request.formData();
    const file     = formData.get('file') as File | null;
    const folder   = (formData.get('folder') as string | null) || 'misc';

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: CORS });
    }

    // Validate type
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only JPG, PNG, WEBP allowed.' }), { status: 400, headers: CORS });
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: `File too large. Maximum size is 5 MB.` }), { status: 400, headers: CORS });
    }

    // Build R2 key: slug/folder/unique-name  (logo + banner use fixed names for easy replacement)
    const slug = tenant.slug as string;
    let key: string;
    if (folder === 'logo' || folder === 'banner') {
      key = `${slug}/${folder}.${ext}`;
    } else {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      key = `${slug}/${folder}/${unique}.${ext}`;
    }

    const r2 = context.env.R2;
    if (!r2) {
      return new Response(JSON.stringify({ error: 'R2 bucket not configured. Add R2 binding in wrangler.toml.' }), { status: 500, headers: CORS });
    }

    await r2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const r2PublicUrl = (context.env.R2_PUBLIC_URL as string || '').replace(/\/$/, '');
    if (!r2PublicUrl) {
      return new Response(JSON.stringify({ error: 'R2_PUBLIC_URL environment variable is not set. Configure it in Cloudflare Pages settings.' }), { status: 500, headers: CORS });
    }

    const imageUrl = `${r2PublicUrl}/${key}`;
    return new Response(JSON.stringify({ imageUrl, key }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

// ── DELETE /api/upload  ────────────────────────────────────────────────────────
// Body: { url: string }  — the full R2 image URL to delete
// Extracts the key from the URL, verifies it belongs to this tenant's slug, then deletes.
export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db       = getDB(context.env);

    const tenant = await queryFirst(db, 'SELECT slug FROM tenants WHERE id = ?', tenantId);
    if (!tenant) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });

    const body: any = await context.request.json();
    const imageUrl  = body.url as string;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'No URL provided' }), { status: 400, headers: CORS });
    }

    const r2PublicUrl = (context.env.R2_PUBLIC_URL as string || '').replace(/\/$/, '');
    const slug        = tenant.slug as string;

    // Extract key from URL
    let key: string;
    if (r2PublicUrl && imageUrl.startsWith(r2PublicUrl)) {
      key = imageUrl.slice(r2PublicUrl.length).replace(/^\//, '');
    } else {
      // Try to parse path from any URL (non-R2 external URLs — just clear from DB, skip R2 delete)
      return new Response(JSON.stringify({ success: true, skipped: true }), { headers: CORS });
    }

    // Security: key must belong to this tenant's slug folder
    if (!key.startsWith(`${slug}/`)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: CORS });
    }

    const r2 = context.env.R2;
    if (r2) await r2.delete(key);

    return new Response(JSON.stringify({ success: true, key }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Delete failed';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
