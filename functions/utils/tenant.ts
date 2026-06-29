import { queryFirst } from '../db';

/**
 * Resolve a tenant row by slug or subdomain, tolerant of how the subdomain was stored.
 *
 * A tenant's `subdomain` column may hold a bare label ("pizza"), a full host
 * ("pizza.menumate.in"), or nothing (in which case it defaults to the slug at creation).
 * So when resolving by host we try, in order: the full host, the first label as a
 * subdomain, and finally the first label as a slug. This lets a tenant be reached at
 * its subdomain regardless of which form the admin entered.
 */
export async function resolveTenantRow(
  db: any,
  opts: { slug?: string | null; subdomain?: string | null },
): Promise<any | null> {
  const { slug, subdomain } = opts;

  if (slug) {
    const s = slug.toLowerCase();
    return (
      (await queryFirst(db, "SELECT * FROM tenants WHERE slug = ? AND status != 'deleted'", s)) ||
      (await queryFirst(db, "SELECT * FROM tenants WHERE subdomain = ? AND status != 'deleted'", s)) ||
      null
    );
  }

  if (subdomain) {
    const host = String(subdomain).toLowerCase();
    const label = host.split('.')[0];
    return (
      (await queryFirst(db, "SELECT * FROM tenants WHERE subdomain = ? AND status != 'deleted'", host)) ||
      (await queryFirst(db, "SELECT * FROM tenants WHERE subdomain = ? AND status != 'deleted'", label)) ||
      (await queryFirst(db, "SELECT * FROM tenants WHERE slug = ? AND status != 'deleted'", label)) ||
      null
    );
  }

  return null;
}
