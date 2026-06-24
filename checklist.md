# FIX: Multi-Tenant Data Isolation is Completely Broken

## Project Context
This is a SaaS restaurant digital menu application (React + Vite + TypeScript, deployed on Cloudflare Pages). It has a Super Admin who creates tenants (restaurants), and each tenant admin manages their own menu. The customer-facing menu page should show only that tenant's data.

## Root Cause Diagnosis (5 Critical Issues)

### ISSUE 1 (CRITICAL): `USE_MOCK_API = true` — App never hits the database
**File:** `src/services/api.ts` line 5
```typescript
const USE_MOCK_API = true; // Force mock API until backend is configured
```
The `categoryAPI`, `menuAPI`, and `authAPI` all check this flag and short-circuit to `mockApi.ts` which uses **browser localStorage**. The MongoDB backend (`functions/db.ts`) and Cloudflare Worker API functions (`functions/api/*`) are NEVER called.

### ISSUE 2 (CRITICAL): Two completely disconnected data systems
There are TWO separate data layers that don't talk to each other:

| Layer | Storage Keys | Tenant-aware? | Used By |
|-------|-------------|---------------|---------|
| `mockApi.ts` | `mock_categories`, `mock_menu_items` | **NO** | `AdminDashboard`, `Menu` page (via `useMenu`/`useMenuItems` hooks → `api.ts`) |
| `tenantApi.ts` | `saas_categories`, `saas_menu_items`, `saas_tenants`, `saas_users` | **YES** | `SuperAdminDashboard`, `AddTenantForm` |

When SuperAdmin creates a tenant via `tenantAPI.createWithAdmin()`, it correctly creates tenant-scoped data in `saas_menu_items` / `saas_categories` with `tenantId` fields. But when a tenant admin logs in and opens `AdminDashboard`, it reads from `mock_menu_items` / `mock_categories` which is the **same hardcoded sample data for everyone**.

### ISSUE 3 (CRITICAL): AdminDashboard has ZERO tenant awareness
**File:** `src/pages/AdminDashboard.tsx`
- Imports `useMenuItems` and `useCategories` from `src/hooks/useMenu.ts`
- These hooks call `menuAPI.getAll()` and `categoryAPI.getAll()` from `src/services/api.ts`
- Which call `mockMenuAPI.getAll()` and `mockCategoryAPI.getAll()` from `src/services/mockApi.ts`
- Which return ALL items from `mock_menu_items` localStorage — no `tenantId` filtering whatsoever
- The `tenantId` stored during login (`localStorage.setItem('current_tenant_id', tenantId)`) is **never read** by any data-fetching code

### ISSUE 4: Customer-facing Menu page (`src/pages/Menu.tsx`) has no tenant awareness
- Uses the same `useMenu` hook → same `mockApi.ts` → same shared data
- The `TenantContext` resolves a tenant from the URL slug but the resolved tenant is **never passed** to data-fetching functions

### ISSUE 5: `restaurantService.ts` uses a single shared localStorage key
**File:** `src/services/restaurantService.ts`
- Uses `restaurant_settings` key — same for all tenants
- All tenants see "Patola" restaurant branding regardless of their own name

---

## Fix Plan — Step-by-Step Instructions

### STEP 1: Unify onto the tenant-aware data layer (DELETE the mock layer)

**Goal:** Make `AdminDashboard` and `Menu` page use the tenant-scoped data from `tenantApi.ts` instead of `mockApi.ts`.

#### 1a. Modify `src/hooks/useMenu.ts`
- Import `tenantMenuAPI` and tenant category functions from `src/services/tenantApi.ts`
- Get the current `tenantId` — either from `TenantContext` or from `localStorage.getItem('current_tenant_id')`
- Replace all calls to `menuAPI.*` with `tenantMenuAPI.*` passing `tenantId`
- Replace all calls to `categoryAPI.*` with tenant-aware category equivalents passing `tenantId`

**Currently missing:** `tenantApi.ts` has `tenantMenuAPI` for menu items but does NOT have a `tenantCategoryAPI`. You need to create one following the same pattern, with `getAll(tenantId)` filtering by `tenantId`.

```typescript
// NEW: Add to tenantApi.ts
export const tenantCategoryAPI = {
  getAll: async (tenantId: string): Promise<TenantCategory[]> => {
    await delay(300);
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
    return categories.filter((cat: TenantCategory) => cat.tenantId === tenantId);
  },

  create: async (tenantId: string, data: Omit<TenantCategory, 'id' | 'tenantId'>): Promise<TenantCategory> => {
    await delay(300);
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
    const newCategory: TenantCategory = {
      ...data,
      id: crypto.randomUUID(),
      tenantId,
    };
    categories.push(newCategory);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    await logAction('category.create', 'Category', newCategory.id);
    return newCategory;
  },

  update: async (id: string, updates: Partial<TenantCategory>): Promise<TenantCategory> => {
    await delay(300);
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
    const index = categories.findIndex((c: TenantCategory) => c.id === id);
    if (index === -1) throw new Error('Category not found');
    ensureTenantAccess(categories[index].tenantId);
    categories[index] = { ...categories[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return categories[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
    const cat = categories.find((c: TenantCategory) => c.id === id);
    if (!cat) throw new Error('Category not found');
    ensureTenantAccess(cat.tenantId);
    const filtered = categories.filter((c: TenantCategory) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
  },
};
```

#### 1b. Rewrite `src/hooks/useMenu.ts` to be tenant-aware

```typescript
import { useState, useEffect } from 'react';
import { tenantMenuAPI, tenantCategoryAPI, setTenantContext } from '@/services/tenantApi';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import toast from 'react-hot-toast';

// Helper to get current tenantId from various sources
const getCurrentTenantId = (): string | null => {
  // Try from admin login context
  const tenantId = localStorage.getItem('current_tenant_id');
  if (tenantId) return tenantId;

  // Try from auth token (decode JWT-like token from mockAuth)
  const token = localStorage.getItem('admin_token');
  if (token) {
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.tenantId || null;
    } catch { /* not a JSON token */ }
  }

  return null;
};

export const useMenuItems = () => {
  const [items, setItems] = useState<TenantMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const tenantId = getCurrentTenantId();

  const fetchItems = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setTenantContext(tenantId, null);
      const data = await tenantMenuAPI.getAll(tenantId);
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<TenantMenuItem, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
    if (!tenantId) throw new Error('No tenant context');
    const newItem = await tenantMenuAPI.create(tenantId, item);
    setItems(prev => [...prev, newItem]);
    toast.success('Menu item added');
    window.dispatchEvent(new Event('menu-updated'));
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<TenantMenuItem>) => {
    const updated = await tenantMenuAPI.update(id, updates);
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    toast.success('Menu item updated');
    window.dispatchEvent(new Event('menu-updated'));
    return updated;
  };

  const deleteItem = async (id: string) => {
    await tenantMenuAPI.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Menu item deleted');
    window.dispatchEvent(new Event('menu-updated'));
  };

  useEffect(() => { fetchItems(); }, [tenantId]);

  return { items, loading, addItem, updateItem, deleteItem, refetch: fetchItems };
};

// Similar pattern for useCategories — use tenantCategoryAPI
```

### STEP 2: Fix AdminLogin to properly set tenant context

**File:** `src/pages/AdminLogin.tsx`

After successful login, the tenant admin's `tenantId` must be reliably stored. Currently it stores `current_tenant_id` only if `tenantSlug` is in the URL, but the `mockAuthAPI.login` also encodes `tenantId` in the base64 token. Make both paths reliable:

```typescript
// After successful login:
const { token } = await authAPI.login(username, password, tenantId || undefined);
localStorage.setItem('admin_token', token);

// ALSO decode and store tenantId from token
try {
  const decoded = JSON.parse(atob(token));
  if (decoded.tenantId) {
    localStorage.setItem('current_tenant_id', decoded.tenantId);
  }
} catch { /* legacy token format */ }

// Also set tenant context for API isolation
if (tenantId) {
  localStorage.setItem('current_tenant_id', tenantId);
  setTenantContext(tenantId, null);
}
```

### STEP 3: Fix the Customer-Facing Menu page

**File:** `src/pages/Menu.tsx`

The Menu page needs to:
1. Resolve tenantId from the URL slug (using `useParams()` + `tenantAPI.getBySlug()`)
2. Pass that tenantId to `tenantMenuAPI.getAll(tenantId)` and `tenantCategoryAPI.getAll(tenantId)`
3. Show 404/not-found if no tenant matches the slug

### STEP 4: Make `restaurantService.ts` tenant-aware

Change the storage key to include tenantId:
```typescript
const getStorageKey = (tenantId: string) => `restaurant_settings_${tenantId}`;
```

Or better, store restaurant info inside the tenant object itself (it already has `name`, `email`, `phone`, `address`).

### STEP 5: Clean up dead code

After the fix works:
- Set `USE_MOCK_API = false` in `src/services/api.ts` or delete the flag entirely
- Delete `src/services/mockApi.ts` (no longer needed)
- Delete `src/data/sampleData.ts` (no longer needed)
- The `api.ts` file can be kept for future real-backend integration but should not be the active data source

### STEP 6: Fix logout to clear tenant context

In both `AdminLogin` logout and `TenantContext.logout()`:
```typescript
localStorage.removeItem('current_tenant_id');
localStorage.removeItem('admin_token');
```

---

## Verification Checklist

After implementing, test this exact flow:

1. **Go to `/super-admin/login`** → login with `admin@menumate.com` / `admin123`
2. **Create Tenant A** (e.g., "Pizza Palace", slug: "pizza-palace") with admin user
3. **Create Tenant B** (e.g., "Burger Barn", slug: "burger-barn") with admin user
4. **Logout from super admin**
5. **Login as Tenant A admin** at `/pizza-palace/admin/login`
6. **Add a menu item** "Margherita Pizza ₹299" in Tenant A's dashboard
7. **Logout**
8. **Login as Tenant B admin** at `/burger-barn/admin/login`
9. **Verify:** Tenant B's dashboard should show ONLY the default sample items created during tenant creation (Spring Rolls, Chicken Wings, etc.) — NOT the Margherita Pizza from Tenant A
10. **Add "Classic Burger ₹199"** in Tenant B
11. **Visit `/pizza-palace`** (customer menu) → should show only Pizza Palace items
12. **Visit `/burger-barn`** (customer menu) → should show only Burger Barn items
13. **Visit `/`** (root) → should show a landing page or tenant selector, NOT any specific tenant's menu

---

## Architecture Diagram (Current vs Fixed)

### CURRENT (Broken):
```
SuperAdmin Dashboard → tenantApi.ts → saas_* localStorage (tenant-aware) ✅
Admin Dashboard      → api.ts → mockApi.ts → mock_* localStorage (SHARED) ❌
Menu Page            → api.ts → mockApi.ts → mock_* localStorage (SHARED) ❌
```

### FIXED (Target):
```
SuperAdmin Dashboard → tenantApi.ts → saas_* localStorage (tenant-aware) ✅
Admin Dashboard      → tenantApi.ts → saas_* localStorage (tenant-aware) ✅
Menu Page            → tenantApi.ts → saas_* localStorage (tenant-aware) ✅
```

---

## Files to Modify (in order)

1. `src/services/tenantApi.ts` — Add `tenantCategoryAPI` (export it)
2. `src/hooks/useMenu.ts` — Rewrite all 3 hooks to use tenant-aware APIs
3. `src/pages/AdminLogin.tsx` — Ensure tenantId is stored after login
4. `src/pages/AdminDashboard.tsx` — Update type imports (TenantMenuItem/TenantCategory instead of MenuItem/Category)
5. `src/pages/Menu.tsx` — Resolve tenant from URL slug, pass to data hooks
6. `src/services/restaurantService.ts` — Make tenant-aware
7. `src/services/api.ts` — Remove `USE_MOCK_API` flag or set to false
8. `src/contexts/TenantContext.tsx` — Ensure logout clears `current_tenant_id`

## Files to eventually delete
- `src/services/mockApi.ts`
- `src/data/sampleData.ts`

## DO NOT change
- `src/services/tenantApi.ts` existing functions (they work correctly)
- `src/types/tenant.ts` (types are correct)
- `src/pages/SuperAdminDashboard.tsx` (works correctly)
- `src/components/AddTenantForm.tsx` (works correctly)
