/**
 * Returns the current hostname when the app is being viewed on a tenant subdomain
 * (e.g. "pizza.menumate.in" or a custom "menu.restaurant.com"), or null when it's a
 * "main" host where tenants are reached via the /<slug> path instead.
 *
 * Main hosts (return null): localhost, *.pages.dev, the apex domain (2 labels),
 * and reserved subdomains (www / admin / api).
 */
export function getTenantSubdomainHost(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;

  if (host === 'localhost' || host === '127.0.0.1') return null;
  if (host.endsWith('.pages.dev')) return null;

  const parts = host.split('.');
  // Need at least 3 labels for a subdomain (sub.domain.tld). An apex like
  // "menumate.in" or "restaurant.com" has 2 and is treated as a main host.
  if (parts.length < 3) return null;

  const sub = parts[0];
  if (sub === 'www' || sub === 'admin' || sub === 'api') return null;

  return host;
}
