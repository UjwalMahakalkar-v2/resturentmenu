import type { Category, MenuItem } from '@/types';
import { sampleCategories, sampleMenuItems } from '@/data/sampleData';

// Mock API for development/testing without backend
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  CATEGORIES: 'mock_categories',
  MENU_ITEMS: 'mock_menu_items',
};

// Initialize data from localStorage or use sample data
const initializeCategories = (): Category[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [...sampleCategories];
    }
  }
  return [...sampleCategories];
};

const initializeMenuItems = (): MenuItem[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return sampleMenuItems.map(item => ({
        ...item,
        hasImage: item.image ? true : false,
      }));
    }
  }
  return sampleMenuItems.map(item => ({
    ...item,
    hasImage: item.image ? true : false,
  }));
};

let categories: Category[] = initializeCategories();
let menuItems: MenuItem[] = initializeMenuItems();

// Save to localStorage
const saveCategories = () => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

const saveMenuItems = () => {
  localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(menuItems));
};

export const mockCategoryAPI = {
  getAll: async (): Promise<Category[]> => {
    await delay(300);
    return [...categories];
  },
  
  create: async (category: Omit<Category, '_id' | 'id'>): Promise<Category> => {
    await delay(300);
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
    };
    categories.push(newCategory);
    saveCategories();
    return newCategory;
  },
  
  update: async (id: string, updates: Partial<Category>): Promise<Category> => {
    await delay(300);
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Category not found');
    categories[index] = { ...categories[index], ...updates };
    saveCategories();
    return categories[index];
  },
  
  delete: async (id: string): Promise<void> => {
    await delay(300);
    categories = categories.filter(c => c.id !== id);
    saveCategories();
  },
};

export const mockMenuAPI = {
  getAll: async (): Promise<MenuItem[]> => {
    await delay(300);
    return [...menuItems];
  },
  
  create: async (item: Omit<MenuItem, '_id' | 'id'>): Promise<MenuItem> => {
    await delay(300);
    const newItem: MenuItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    menuItems.push(newItem);
    saveMenuItems();
    return newItem;
  },
  
  update: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
    await delay(300);
    const index = menuItems.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Item not found');
    menuItems[index] = { ...menuItems[index], ...updates };
    saveMenuItems();
    return menuItems[index];
  },
  
  delete: async (id: string): Promise<void> => {
    await delay(300);
    menuItems = menuItems.filter(i => i.id !== id);
    saveMenuItems();
  },
};

export const mockAuthAPI = {
  login: async (username: string, password: string): Promise<{ token: string }> => {
    await delay(500);
    if (username === 'admin' && password === 'admin123') {
      return { token: 'mock-token-' + Date.now() };
    }
    throw new Error('Invalid credentials');
  },
};
