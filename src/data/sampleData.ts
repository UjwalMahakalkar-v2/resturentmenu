import { Category, MenuItem } from '@/types';

export const sampleCategories: Category[] = [
  { id: 'soup', name: 'Soup', order: 1 },
  { id: 'chinese-sizzlers', name: 'Chinese Sizzlers', order: 2 },
  { id: 'beverages', name: 'Indian Beverages', order: 3 },
];

export const sampleMenuItems: MenuItem[] = [
  // SOUP (From your PDF screenshots)
  { id: '1', name: 'Tomato Soup', description: 'Classic tomato soup', price: 80, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '2', name: 'Hot & Sour Soup', description: 'Spicy and tangy soup', price: 90, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '3', name: 'Sweet Corn Soup', description: 'Creamy sweet corn soup', price: 90, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '4', name: 'Manchow Soup', description: 'Spicy Manchow soup', price: 90, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '5', name: 'Lemon Coriander Soup', description: 'Tangy lemon and coriander soup', price: 90, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '6', name: 'Veg Clear Soup', description: 'Light vegetable clear soup', price: 80, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '7', name: 'Chicken Hot & Sour Soup', description: 'Spicy chicken soup', price: 110, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'non-veg', popular: false, available: true, hasImage: true },
  { id: '8', name: 'Chicken Manchow Soup', description: 'Spicy chicken Manchow soup', price: 110, category: 'soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', type: 'non-veg', popular: false, available: true, hasImage: true },

  // CHINESE SIZZLERS (From your PDF screenshots)
  { id: '9', name: 'Veg Sizzler', description: 'Assorted vegetables on sizzler', price: 280, category: 'chinese-sizzlers', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop', type: 'veg', popular: true, available: true, hasImage: true },
  { id: '10', name: 'Paneer Sizzler', description: 'Cottage cheese on sizzler', price: 300, category: 'chinese-sizzlers', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop', type: 'veg', popular: true, available: true, hasImage: true },
  { id: '11', name: 'Mushroom Sizzler', description: 'Mushroom on sizzler', price: 300, category: 'chinese-sizzlers', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '12', name: 'Chicken Sizzler', description: 'Grilled chicken on sizzler', price: 350, category: 'chinese-sizzlers', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop', type: 'non-veg', popular: true, available: true, hasImage: true },
  { id: '13', name: 'Fish Sizzler', description: 'Grilled fish on sizzler', price: 380, category: 'chinese-sizzlers', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop', type: 'non-veg', popular: false, available: true, hasImage: true },
  { id: '14', name: 'Prawns Sizzler', description: 'Grilled prawns on sizzler', price: 450, category: 'chinese-sizzlers', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop', type: 'non-veg', popular: false, available: true, hasImage: true },

  // INDIAN BEVERAGES (From your PDF screenshots)
  { id: '15', name: 'Lassi Sweet', description: 'Sweet yogurt drink', price: 70, category: 'beverages', hasImage: false, type: 'veg', popular: false, available: true },
  { id: '16', name: 'Lassi Salted', description: 'Salted yogurt drink', price: 70, category: 'beverages', hasImage: false, type: 'veg', popular: false, available: true },
  { id: '17', name: 'Butter Milk', description: 'Traditional buttermilk', price: 50, category: 'beverages', hasImage: false, type: 'veg', popular: false, available: true },
  { id: '18', name: 'Masala Chaas', description: 'Spiced buttermilk', price: 60, category: 'beverages', hasImage: false, type: 'veg', popular: false, available: true },
  { id: '19', name: 'Cold Coffee', description: 'Chilled coffee drink', price: 90, category: 'beverages', image: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=400&h=300&fit=crop', type: 'veg', popular: true, available: true, hasImage: true },
  { id: '20', name: 'Fresh Lime Soda', description: 'Refreshing lime soda', price: 60, category: 'beverages', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', type: 'veg', popular: false, available: true, hasImage: true },
  { id: '21', name: 'Fresh Lime Water', description: 'Fresh lime in water', price: 50, category: 'beverages', hasImage: false, type: 'veg', popular: false, available: true },
];
