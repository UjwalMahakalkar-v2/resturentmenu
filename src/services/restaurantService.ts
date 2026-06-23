import type { Restaurant } from '@/types';

const STORAGE_KEY = 'restaurant_settings';

const defaultRestaurant: Restaurant = {
  name: 'Patola',
  tagline: 'Authentic Indian & Chinese Cuisine',
  logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop',
  heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
  phone: '8421155938',
  email: 'info@patolarestaurant.com',
  location: 'Wardha Rd, Nagpur, Khapri, Maharashtra 441108',
  about: 'Experience authentic Indian and Chinese cuisine at Patola. We serve delicious food with love and care.',
};

export const restaurantService = {
  get: (): Restaurant => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultRestaurant;
      }
    }
    return defaultRestaurant;
  },

  save: (restaurant: Restaurant): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurant));
  },

  update: (updates: Partial<Restaurant>): Restaurant => {
    const current = restaurantService.get();
    const updated = { ...current, ...updates };
    restaurantService.save(updated);
    return updated;
  },
};
