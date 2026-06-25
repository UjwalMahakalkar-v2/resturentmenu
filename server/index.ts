/**
 * Express.js API server — wraps all Cloudflare Pages Functions so they run
 * on a standard Node.js host (Render, Railway, Vercel, etc.) with real TCP
 * support for MongoDB Atlas.
 *
 * Deploy to Render.com:
 *   Build: npm install && npm run server:build
 *   Start: node dist-server/index.js
 */
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── function modules ──────────────────────────────────────────────────────────
import * as health from '../functions/api/health.js';
import * as userLogin from '../functions/api/auth/user-login.js';
import * as tenantsCol from '../functions/api/tenants.js';
import * as tenantById from '../functions/api/tenants/[id].js';
import * as menuCol from '../functions/api/menu.js';
import * as menuById from '../functions/api/menu/[id].js';
import * as categoriesCol from '../functions/api/categories.js';
import * as categoryById from '../functions/api/categories/[id].js';
import * as analytics from '../functions/api/analytics.js';
import * as restaurantSettings from '../functions/api/restaurant-settings.js';
import * as publicRestaurantSettings from '../functions/api/public/restaurant-settings.js';
import * as publicMenu from '../functions/api/public/menu.js';
import * as publicCategories from '../functions/api/public/categories.js';
import * as publicTenant from '../functions/api/public/tenant.js';
import * as impersonate from '../functions/api/impersonate.js';
import * as bulkImport from '../functions/api/menu-bulk-import.js';
import * as adminCleanup from '../functions/api/admin/cleanup.js';
import * as socialTrack from '../functions/api/social-analytics/track.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '2mb' }));

// ── adapter ───────────────────────────────────────────────────────────────────
type CFHandlers = Record<string, (ctx: any) => Promise<Response>>;

function adaptRoute(handlers: CFHandlers) {
  return async (req: express.Request, res: express.Response) => {
    const method = req.method.toUpperCase();
    const handlerKey =
      method === 'GET' ? 'onRequestGet' :
      method === 'POST' ? 'onRequestPost' :
      method === 'PUT' ? 'onRequestPut' :
      method === 'PATCH' ? 'onRequestPatch' :
      method === 'DELETE' ? 'onRequestDelete' :
      method === 'OPTIONS' ? 'onRequestOptions' : null;

    const handler = handlerKey ? (handlers as any)[handlerKey] : undefined;
    if (!handler) {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Build a Web API Request that looks like what Workers receives
    const url = `http://localhost${req.originalUrl}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    }

    const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(method);
    const request = new Request(url, {
      method,
      headers,
      body: hasBody && Object.keys(req.body ?? {}).length ? JSON.stringify(req.body) : undefined,
    });

    const context = { request, params: req.params, env: {} };

    try {
      const response = await handler(context);
      res.status(response.status);
      response.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() !== 'content-encoding') res.setHeader(key, value);
      });
      const body = await response.text();
      res.send(body);
    } catch (err: any) {
      console.error(`[${method} ${req.path}]`, err);
      res.status(500).json({ error: err?.message ?? 'Internal server error' });
    }
  };
}

// ── routes ────────────────────────────────────────────────────────────────────
app.all('/api/health', adaptRoute(health));

app.all('/api/auth/user-login', adaptRoute(userLogin));

app.all('/api/tenants', adaptRoute(tenantsCol));
app.all('/api/tenants/:id', adaptRoute(tenantById));

app.all('/api/menu', adaptRoute(menuCol));
app.all('/api/menu/:id', adaptRoute(menuById));

app.all('/api/categories', adaptRoute(categoriesCol));
app.all('/api/categories/:id', adaptRoute(categoryById));

app.all('/api/analytics', adaptRoute(analytics));
app.all('/api/restaurant-settings', adaptRoute(restaurantSettings));

app.all('/api/public/restaurant-settings', adaptRoute(publicRestaurantSettings));
app.all('/api/public/menu', adaptRoute(publicMenu));
app.all('/api/public/categories', adaptRoute(publicCategories));
app.all('/api/public/tenant', adaptRoute(publicTenant));

app.all('/api/impersonate', adaptRoute(impersonate));
app.all('/api/menu-bulk-import', adaptRoute(bulkImport));
app.all('/api/admin/cleanup', adaptRoute(adminCleanup));
app.all('/api/social-analytics/track', adaptRoute(socialTrack));

// Root health check (Render pings '/')
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'resturentmenu-api' }));

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
