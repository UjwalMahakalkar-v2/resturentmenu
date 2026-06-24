import type { Restaurant } from '@/types';
import { tenantAPI } from './tenantApi';

const getStorageKey = (tenantId: string) => `restaurant_settings_${tenantId}`;

const getCurrentTenantId = (): string | null => {
  return localStorage.getItem('current_tenant_id');
};

const getDefaultRestaurant = async (tenantId?: string): Promise<Restaurant> => {
  if (tenantId) {
    try {
      const tenant = await tenantAPI.getById(tenantId);
      if (tenant) {
        return {
          name: tenant.name,
          tagline: 'Delicious food, served with love',
          logo: '',
          heroImage: '',
          phone: tenant.phone,
          email: tenant.email,
          location: tenant.address || '',
          about: `Welcome to ${tenant.name}. We serve delicious food with love and care.`,
        };
      }
    } catch (err) {
      console.error(err);
    }
  }
  
  return {
    name: 'Restaurant',
    tagline: 'Delicious food, served with love',
    logo: '',
    heroImage: '',
    phone: '',
    email: '',
    location: '',
    about: 'Welcome to our restaurant.',
  };
};

export const restaurantService = {
  get: async (tenantId?: string): Promise<Restaurant> => {
    const activeTenantId = tenantId || getCurrentTenantId();
    if (!activeTenantId) {
      return getDefaultRestaurant();
    }

    const stored = localStorage.getItem(getStorageKey(activeTenantId));
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getDefaultRestaurant(activeTenantId);
      }
    }
    return getDefaultRestaurant(activeTenantId);
  },

  save: (restaurant: Restaurant, tenantId?: string): void => {
    const activeTenantId = tenantId || getCurrentTenantId();
    if (!activeTenantId) return;
    localStorage.setItem(getStorageKey(activeTenantId), JSON.stringify(restaurant));
  },

  update: async (updates: Partial<Restaurant>, tenantId?: string): Promise<Restaurant> => {
    const current = await restaurantService.get(tenantId);
    const updated = { ...current, ...updates };
    restaurantService.save(updated, tenantId);
    return updated;
  },
};
