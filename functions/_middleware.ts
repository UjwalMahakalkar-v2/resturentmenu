import { getDB, queryFirst } from './db';
import { resolveTenantRow } from './utils/tenant';

/**
 * Per-tenant social/SEO preview tags.
 *
 * Social crawlers (WhatsApp, Facebook, Twitter, iMessage) don't run JS, so the
 * static index.html must already carry the right Open Graph / Twitter tags. This
 * middleware detects a tenant menu document request (path `/:slug` or a tenant
 * subdomain root), looks up the tenant's name/tagline/logo, and rewrites the
 * served HTML's <head> with HTMLRewriter. Everything else passes through untouched.
 */

function subdomainHost(host: string): string | null {
  if (host === 'localhost' || host === '127.0.0.1') return null;
  if (host.endsWith('.pages.dev')) return null;
  const parts = host.split('.');
  if (parts.length < 3) return null;
  if (['www', 'admin', 'api'].includes(parts[0])) return null;
  return host;
}

const RESERVED = new Set(['admin', 'super-admin', 'api', 'assets', 'icons']);

function attr(v: string): string {
  return String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function onRequest(context: any) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Only intervene on top-level HTML document GETs; never on the API.
  if (path.startsWith('/api/')) return next();
  const accept = request.headers.get('accept') || '';
  if (request.method !== 'GET' || !accept.includes('text/html')) return next();

  // Resolve which tenant (if any) this document is for.
  const seg = path.split('/').filter(Boolean);
  let slug: string | null = null;
  let subdomain: string | null = null;
  if (seg.length === 0) {
    subdomain = subdomainHost(url.hostname);
  } else if (seg.length === 1 && !RESERVED.has(seg[0]) && !seg[0].includes('.')) {
    slug = seg[0];
  }

  const response = await next();
  if (!slug && !subdomain) return response;

  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return response;

  try {
    const db = getDB(env);
    const tenant = await resolveTenantRow(db, { slug, subdomain });
    if (!tenant) return response;
    const s: any = await queryFirst(db, 'SELECT name, tagline, logo, hero_image FROM restaurant_settings WHERE tenant_id = ?', tenant.id).catch(() => null);

    const name = (s?.name || tenant.name || 'Restaurant').trim();
    const title = `${name} — Menu`;
    const desc = (s?.tagline || 'Browse our menu — view dishes, prices and more.').trim();
    let image = (s?.logo || s?.hero_image || '').trim();
    if (image && !/^https?:\/\//.test(image)) image = ''; // only absolute URLs work in previews
    const ogUrl = url.href;

    const setContent = (val: string) => ({ element(el: any) { el.setAttribute('content', val); } });

    let rw = new HTMLRewriter()
      .on('title', { element(el: any) { el.setInnerContent(title); } })
      .on('meta[name="description"]', setContent(desc))
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(desc))
      .on('meta[property="twitter:title"]', setContent(title))
      .on('meta[property="twitter:description"]', setContent(desc));

    if (image) {
      rw = rw.on('meta[property="og:image"]', setContent(image));
    }

    // Append tags that aren't already in the static head (url, site name, twitter image).
    rw = rw.on('head', {
      element(el: any) {
        let extra = `<meta property="og:url" content="${attr(ogUrl)}"><meta property="og:site_name" content="${attr(name)}">`;
        if (image) extra += `<meta property="twitter:image" content="${attr(image)}">`;
        el.append(extra, { html: true });
      },
    });

    return rw.transform(response);
  } catch {
    return response; // never break page delivery over a preview-tag failure
  }
}
