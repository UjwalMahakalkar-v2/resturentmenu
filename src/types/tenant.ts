// Multi-tenant types for SaaS application

export type UserRole = 'super_admin' | 'tenant_admin' | 'tenant_staff' | 'customer';

export type SubscriptionPlan = 'starter' | 'business' | 'premium';

export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled' | 'expired';

export type TenantStatus = 'active' | 'suspended' | 'inactive' | 'deleted';

export interface Tenant {
  _id?: string;
  id: string;
  slug: string; // For subdomain: patola.menumate.in
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  status: TenantStatus;
  subscriptionId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Soft delete
}

export interface User {
  _id?: string;
  id: string;
  tenantId?: string; // null for super admin
  email: string;
  password: string; // hashed
  name: string;
  role: UserRole;
  permissions: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Subscription {
  _id?: string;
  id: string;
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
  features: FeatureFlags;
  limits: SubscriptionLimits;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlags {
  menu: boolean;
  analytics: boolean;
  ordering: boolean;
  loyalty: boolean;
  customDomain: boolean;
  qrCode: boolean;
  multiLocation: boolean;
  advancedAnalytics: boolean;
}

export interface SubscriptionLimits {
  maxMenuItems: number;
  maxUsers: number;
  maxLocations: number;
  storageGB: number;
}

export interface Domain {
  _id?: string;
  id: string;
  tenantId: string;
  domain: string; // e.g., menu.restaurant.com
  type: 'subdomain' | 'custom';
  verified: boolean;
  isPrimary: boolean;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface AuditLog {
  _id?: string;
  id: string;
  tenantId?: string; // null for super admin actions
  userId: string;
  action: string; // e.g., 'menu.item.update'
  resource: string; // e.g., 'MenuItem'
  resourceId: string;
  changes?: {
    before: any;
    after: any;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

// Tenant-aware base interface
export interface TenantResource {
  tenantId: string;
}

// Extended types with tenant isolation
export interface TenantMenuItem extends TenantResource {
  _id?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  hasImage: boolean;
  type: 'veg' | 'non-veg';
  popular: boolean;
  available: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TenantCategory extends TenantResource {
  id: string;
  name: string;
  order: number;
}

export interface TenantRestaurant extends TenantResource {
  _id?: string;
  name: string;
  tagline: string;
  logo: string;
  heroImage: string;
  phone: string;
  email: string;
  location: string;
  about: string;
}

// Plan definitions
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, {
  name: string;
  price: number;
  limits: SubscriptionLimits;
  features: FeatureFlags;
}> = {
  starter: {
    name: 'Starter',
    price: 999,
    limits: {
      maxMenuItems: 50,
      maxUsers: 2,
      maxLocations: 1,
      storageGB: 1,
    },
    features: {
      menu: true,
      analytics: false,
      ordering: false,
      loyalty: false,
      customDomain: false,
      qrCode: true,
      multiLocation: false,
      advancedAnalytics: false,
    },
  },
  business: {
    name: 'Business',
    price: 2999,
    limits: {
      maxMenuItems: 200,
      maxUsers: 5,
      maxLocations: 3,
      storageGB: 5,
    },
    features: {
      menu: true,
      analytics: true,
      ordering: true,
      loyalty: false,
      customDomain: false,
      qrCode: true,
      multiLocation: true,
      advancedAnalytics: false,
    },
  },
  premium: {
    name: 'Premium',
    price: 5999,
    limits: {
      maxMenuItems: -1, // unlimited
      maxUsers: -1,
      maxLocations: -1,
      storageGB: 20,
    },
    features: {
      menu: true,
      analytics: true,
      ordering: true,
      loyalty: true,
      customDomain: true,
      qrCode: true,
      multiLocation: true,
      advancedAnalytics: true,
    },
  },
};

// Permission definitions
export const PERMISSIONS: Permission[] = [
  { id: 'menu.view', name: 'View Menu', description: 'View menu items', resource: 'menu', action: 'view' },
  { id: 'menu.create', name: 'Create Menu Items', description: 'Add new menu items', resource: 'menu', action: 'create' },
  { id: 'menu.update', name: 'Update Menu Items', description: 'Edit menu items', resource: 'menu', action: 'update' },
  { id: 'menu.delete', name: 'Delete Menu Items', description: 'Remove menu items', resource: 'menu', action: 'delete' },
  { id: 'users.view', name: 'View Users', description: 'View user list', resource: 'users', action: 'view' },
  { id: 'users.manage', name: 'Manage Users', description: 'Create, edit, delete users', resource: 'users', action: 'manage' },
  { id: 'analytics.view', name: 'View Analytics', description: 'Access analytics dashboard', resource: 'analytics', action: 'view' },
  { id: 'settings.manage', name: 'Manage Settings', description: 'Update restaurant settings', resource: 'settings', action: 'manage' },
  { id: 'tenant.manage', name: 'Manage Tenants', description: 'Super admin only - manage all tenants', resource: 'tenant', action: 'manage' },
];
