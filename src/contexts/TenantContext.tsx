import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, User } from '@/types/tenant';
import { tenantAPI } from '@/services/tenantApi';

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
    // Initialize tenant and user from localStorage/session
    initializeContext();
  }, []);

  const initializeContext = async () => {
    try {
      // Get stored auth token
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');
      const storedTenant = localStorage.getItem('tenant');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (storedTenant) {
        setTenant(JSON.parse(storedTenant));
      } else {
        // Resolve tenant from subdomain/domain
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
    // Extract subdomain from hostname
    const hostname = window.location.hostname;
    
    // For development: localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Check if there's a tenant slug in path or query
      const pathParts = window.location.pathname.split('/');
      const tenantSlug = pathParts[1]; // e.g., /patola/menu
      
      if (tenantSlug && tenantSlug !== 'admin' && tenantSlug !== 'super-admin') {
        // Fetch tenant by slug
        return await fetchTenantBySlug(tenantSlug);
      }
      return null;
    }

    // For production: subdomain.menumate.in or custom domain
    const parts = hostname.split('.');
    
    if (parts.length >= 3) {
      // subdomain.menumate.in
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'admin') {
        return await fetchTenantBySlug(subdomain);
      }
    }

    // Check if it's a custom domain
    return await fetchTenantByDomain(hostname);
  };

  const fetchTenantBySlug = async (slug: string): Promise<Tenant | null> => {
    try {
      const tenant = await tenantAPI.getBySlug(slug);
      return tenant;
    } catch (error) {
      console.error('Failed to fetch tenant by slug:', error);
      return null;
    }
  };

  const fetchTenantByDomain = async (domain: string): Promise<Tenant | null> => {
    try {
      // Check if domain is a subdomain (e.g., pizza-palace.menumate.in)
      const tenant = await tenantAPI.getBySubdomain(domain);
      return tenant;
    } catch (error) {
      console.error('Failed to fetch tenant by domain:', error);
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('current_tenant_id');
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
