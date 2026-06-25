import type { Restaurant } from '@/types';
import { restaurantSettingsAPI, publicAPI } from './api';

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
  /**
   * Fetch restaurant settings.
   * - With tenantId: uses the public endpoint (customer-facing menu page)
   * - Without tenantId: uses the authenticated endpoint (admin panel)
   */
  get: async (tenantId?: string): Promise<Restaurant> => {
    try {
      if (tenantId) {
        const data = await publicAPI.getRestaurantSettings(tenantId);
        // If empty object returned (no settings saved yet), merge with defaults
        return Object.keys(data).length > 0 ? { ...getDefaultRestaurant(), ...data } : getDefaultRestaurant();
      }
      const data = await restaurantSettingsAPI.get();
      return Object.keys(data).length > 0 ? { ...getDefaultRestaurant(), ...data } : getDefaultRestaurant();
    } catch {
      return getDefaultRestaurant();
    }
  },

  /**
   * Save restaurant settings (admin only — uses auth token).
   */
  save: async (restaurant: Restaurant): Promise<Restaurant> => {
    return restaurantSettingsAPI.save(restaurant);
  },

  update: async (updates: Partial<Restaurant>): Promise<Restaurant> => {
    return restaurantSettingsAPI.save(updates as Restaurant);
  },
};
