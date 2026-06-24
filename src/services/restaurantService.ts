import type { Restaurant } from '@/types';

const getStorageKey = (tenantId: string) => `restaurant_settings_${tenantId}`;

const getCurrentTenantId = (): string | null => {
  return localStorage.getItem('current_tenant_id');
};

const getDefaultRestaurant = (): Restaurant => ({
  name: 'Restaurant',
  tagline: 'Delicious food, served with love',
  logo: '',
  heroImage: '',
  phone: '',
  email: '',
  location: '',
  about: 'Welcome to our restaurant.',
});

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
        return getDefaultRestaurant();
      }
    }
    return getDefaultRestaurant();
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
