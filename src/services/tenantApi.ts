import type { 
  Tenant, 
  User, 
  Subscription, 
  TenantMenuItem, 
  TenantCategory,
  AuditLog,
  FeatureFlags 
} from '@/types/tenant';

const STORAGE_KEYS = {
  TENANTS: 'saas_tenants',
  USERS: 'saas_users',
  SUBSCRIPTIONS: 'saas_subscriptions',
  MENU_ITEMS: 'saas_menu_items',
  CATEGORIES: 'saas_categories',
  AUDIT_LOGS: 'saas_audit_logs',
  DOMAINS: 'saas_domains',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to get current tenant ID from context
let currentTenantId: string | null = null;
let currentUserId: string | null = null;

export const setTenantContext = (tenantId: string | null, userId: string | null) => {
  currentTenantId = tenantId;
  currentUserId = userId;
};

// Helper to ensure tenant isolation
const ensureTenantAccess = (resourceTenantId: string) => {
  if (!currentTenantId) {
    throw new Error('No tenant context set');
  }
  if (currentTenantId !== resourceTenantId) {
    throw new Error('Access denied: Tenant isolation violation');
  }
};

// Audit logging helper
const logAction = async (action: string, resource: string, resourceId: string, changes?: any) => {
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
  const log: AuditLog = {
    id: crypto.randomUUID(),
    tenantId: currentTenantId || undefined,
    userId: currentUserId || 'system',
    action,
    resource,
    resourceId,
    changes,
    createdAt: new Date(),
  };
  logs.push(log);
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
};

// Initialize storage with default data
const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    // Create default super admin
    const superAdmin: User = {
      id: 'user_super_admin',
      email: 'admin@menumate.com',
      password: 'admin123', // In production, this should be hashed
      name: 'Super Admin',
      role: 'super_admin',
      permissions: ['*'], // All permissions
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([superAdmin]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS)) {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MENU_ITEMS)) {
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DOMAINS)) {
    localStorage.setItem(STORAGE_KEYS.DOMAINS, JSON.stringify([]));
  }
};

initializeStorage();

// Tenant API
export const tenantAPI = {
  getAll: async (): Promise<Tenant[]> => {
    await delay(300);
    const tenants = JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
    return tenants;
  },

  getById: async (id: string): Promise<Tenant | null> => {
    await delay(300);
    const tenants = JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
    return tenants.find((t: Tenant) => t.id === id) || null;
  },

  getBySlug: async (slug: string): Promise<Tenant | null> => {
    await delay(300);
    const tenants = JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
    return tenants.find((t: Tenant) => t.slug === slug) || null;
  },

  create: async (data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> => {
    await delay(300);
    const tenants = JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
    
    // Check if slug already exists
    if (tenants.some((t: Tenant) => t.slug === data.slug)) {
      throw new Error('Slug already exists');
    }

    const newTenant: Tenant = {
      ...data,
      id: `tenant_${crypto.randomUUID()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tenants.push(newTenant);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    
    await logAction('tenant.create', 'Tenant', newTenant.id);
    
    return newTenant;
  },

  update: async (id: string, updates: Partial<Tenant>): Promise<Tenant> => {
    await delay(300);
    const tenants = JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
    const index = tenants.findIndex((t: Tenant) => t.id === id);
    
    if (index === -1) throw new Error('Tenant not found');

    const before = { ...tenants[index] };
    tenants[index] = { ...tenants[index], ...updates, updatedAt: new Date() };
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    
    await logAction('tenant.update', 'Tenant', id, { before, after: tenants[index] });
    
    return tenants[index];
  },

  delete: async (id: string, hard: boolean = false): Promise<void> => {
    await delay(300);
    let tenants = JSON.parse(localStorage.getItem(STORAGE_KEYS.TENANTS) || '[]');
    
    if (hard) {
      // Hard delete - remove all tenant data
      tenants = tenants.filter((t: Tenant) => t.id !== id);
      
      // Delete all tenant-related data
      const menuItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENU_ITEMS) || '[]');
      const filteredItems = menuItems.filter((item: TenantMenuItem) => item.tenantId !== id);
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(filteredItems));
      
      const categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]');
      const filteredCategories = categories.filter((cat: TenantCategory) => cat.tenantId !== id);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filteredCategories));
      
      await logAction('tenant.delete.hard', 'Tenant', id);
    } else {
      // Soft delete
      const index = tenants.findIndex((t: Tenant) => t.id === id);
      if (index !== -1) {
        tenants[index].status = 'deleted';
        tenants[index].deletedAt = new Date();
        await logAction('tenant.delete.soft', 'Tenant', id);
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
  },

  suspend: async (id: string): Promise<Tenant> => {
    return await tenantAPI.update(id, { status: 'suspended' });
  },

  activate: async (id: string): Promise<Tenant> => {
    return await tenantAPI.update(id, { status: 'active' });
  },
};

// User API (tenant-aware)
export const userAPI = {
  getAll: async (tenantId?: string): Promise<User[]> => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    if (tenantId) {
      return users.filter((u: User) => u.tenantId === tenantId);
    }
    
    return users;
  },

  create: async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    // Check if email already exists
    if (users.some((u: User) => u.email === data.email)) {
      throw new Error('Email already exists');
    }

    const newUser: User = {
      ...data,
      id: `user_${crypto.randomUUID()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    await logAction('user.create', 'User', newUser.id);
    
    return newUser;
  },

  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    await delay(500);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find((u: User) => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.active) {
      throw new Error('Account is inactive');
    }

    // Update last login
    user.lastLoginAt = new Date();
    const index = users.findIndex((u: User) => u.id === user.id);
    users[index] = user;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const token = `token_${crypto.randomUUID()}`;
    
    await logAction('user.login', 'User', user.id);
    
    return { user, token };
  },
};

// Subscription API
export const subscriptionAPI = {
  getByTenantId: async (tenantId: string): Promise<Subscription | null> => {
    await delay(300);
    const subscriptions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || '[]');
    return subscriptions.find((s: Subscription) => s.tenantId === tenantId) || null;
  },

  create: async (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> => {
    await delay(300);
    const subscriptions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || '[]');
    
    const newSubscription: Subscription = {
      ...data,
      id: `sub_${crypto.randomUUID()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    subscriptions.push(newSubscription);
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
    
    await logAction('subscription.create', 'Subscription', newSubscription.id);
    
    return newSubscription;
  },

  updateFeatures: async (tenantId: string, features: Partial<FeatureFlags>): Promise<Subscription> => {
    await delay(300);
    const subscriptions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || '[]');
    const index = subscriptions.findIndex((s: Subscription) => s.tenantId === tenantId);
    
    if (index === -1) throw new Error('Subscription not found');

    const before = { ...subscriptions[index].features };
    subscriptions[index].features = { ...subscriptions[index].features, ...features };
    subscriptions[index].updatedAt = new Date();
    
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
    
    await logAction('subscription.features.update', 'Subscription', subscriptions[index].id, { before, after: subscriptions[index].features });
    
    return subscriptions[index];
  },
};

// Tenant-aware Menu Item API
export const tenantMenuAPI = {
  getAll: async (tenantId: string): Promise<TenantMenuItem[]> => {
    await delay(300);
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENU_ITEMS) || '[]');
    return items.filter((item: TenantMenuItem) => item.tenantId === tenantId);
  },

  create: async (tenantId: string, data: Omit<TenantMenuItem, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<TenantMenuItem> => {
    await delay(300);
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENU_ITEMS) || '[]');
    
    const newItem: TenantMenuItem = {
      ...data,
      id: crypto.randomUUID(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    items.push(newItem);
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    
    await logAction('menu.item.create', 'MenuItem', newItem.id);
    
    return newItem;
  },

  update: async (id: string, updates: Partial<TenantMenuItem>): Promise<TenantMenuItem> => {
    await delay(300);
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENU_ITEMS) || '[]');
    const index = items.findIndex((item: TenantMenuItem) => item.id === id);
    
    if (index === -1) throw new Error('Item not found');
    
    // Ensure tenant isolation
    ensureTenantAccess(items[index].tenantId);

    const before = { ...items[index] };
    items[index] = { ...items[index], ...updates, updatedAt: new Date() };
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    
    await logAction('menu.item.update', 'MenuItem', id, { before, after: items[index] });
    
    return items[index];
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENU_ITEMS) || '[]');
    const item = items.find((i: TenantMenuItem) => i.id === id);
    
    if (!item) throw new Error('Item not found');
    
    // Ensure tenant isolation
    ensureTenantAccess(item.tenantId);

    const filtered = items.filter((i: TenantMenuItem) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(filtered));
    
    await logAction('menu.item.delete', 'MenuItem', id);
  },
};

// Audit Log API
export const auditLogAPI = {
  getAll: async (tenantId?: string): Promise<AuditLog[]> => {
    await delay(300);
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
    
    if (tenantId) {
      return logs.filter((log: AuditLog) => log.tenantId === tenantId);
    }
    
    return logs;
  },
};
