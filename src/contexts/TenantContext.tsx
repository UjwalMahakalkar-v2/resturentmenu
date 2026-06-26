import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, User } from '@/types/tenant';
import { publicAPI } from '@/services/api';

interface TenantContextType {
  tenant: Tenant | null;
  user: User | null;
  loading: boolean;
  setTenant: (tenant: Tenant | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: () => boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider = ({ children }: TenantProviderProps) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeContext();
  }, []);

  const initializeContext = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      const storedTenant = localStorage.getItem('tenant');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (storedTenant) {
        setTenant(JSON.parse(storedTenant));
      } else {
        const resolvedTenant = await resolveTenantFromDomain();
        if (resolvedTenant) {
          setTenant(resolvedTenant);
          localStorage.setItem('tenant', JSON.stringify(resolvedTenant));
        }
      }
    } catch (error) {
      console.error('Failed to initialize context:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveTenantFromDomain = async (): Promise<Tenant | null> => {
    const hostname = window.location.hostname;

    // Localhost / development — resolve from URL path
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const pathParts = window.location.pathname.split('/');
      const tenantSlug = pathParts[1];
      if (tenantSlug && tenantSlug !== 'admin' && tenantSlug !== 'super-admin') {
        return await fetchTenantBySlug(tenantSlug);
      }
      return null;
    }

    // Production: check if this is a subdomain-based access
    // e.g. pizza-palace.menumate.in  or  menu.restaurant.com
    const parts = hostname.split('.');

    // *.pages.dev — main deployment, tenants accessed via /<slug> path
    if (hostname.endsWith('.pages.dev')) {
      return null;
    }

    // *.menumate.in — subdomain-based tenant access
    if (parts.length >= 3 && hostname.endsWith('.menumate.in')) {
      const sub = parts[0];
      if (sub !== 'www' && sub !== 'admin' && sub !== 'api') {
        return await fetchTenantBySubdomain(hostname);
      }
      return null;
    }

    // Custom domain (e.g. menu.restaurant.com) — look up by full hostname
    if (parts.length >= 2) {
      return await fetchTenantBySubdomain(hostname);
    }

    return null;
  };

  const fetchTenantBySlug = async (slug: string): Promise<Tenant | null> => {
    try {
      const data = await publicAPI.getTenantBySlug(slug);
      return data as unknown as Tenant;
    } catch {
      return null;
    }
  };

  const fetchTenantBySubdomain = async (subdomain: string): Promise<Tenant | null> => {
    try {
      const data = await publicAPI.getTenantBySubdomain(subdomain);
      return data as unknown as Tenant;
    } catch {
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('current_tenant_id');
    localStorage.removeItem('current_tenant_slug');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    setUser(null);
    setTenant(null);
    window.location.href = '/';
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions.includes(permission);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role === 'super_admin';
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        user,
        loading,
        setTenant,
        setUser,
        logout,
        hasPermission,
        isSuperAdmin,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};
