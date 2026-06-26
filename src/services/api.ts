import axios from 'axios';
import type { Category, MenuItem, Restaurant, Admin } from '@/types';

export type { Restaurant };

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests — check admin_token (tenant admin) first, then auth_token (super admin)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Categories API (authenticated)
export const categoryAPI = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  create: async (category: Omit<Category, '_id' | 'id'>): Promise<Category> => {
    const response = await api.post('/categories', category);
    return response.data;
  },

  update: async (id: string, category: Partial<Category>): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, category);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

// Menu Items API (authenticated)
export const menuAPI = {
  getAll: async (): Promise<MenuItem[]> => {
    const response = await api.get('/menu');
    return response.data;
  },

  getById: async (id: string): Promise<MenuItem> => {
    const response = await api.get(`/menu/${id}`);
    return response.data;
  },

  create: async (item: Omit<MenuItem, '_id' | 'id'>): Promise<MenuItem> => {
    const response = await api.post('/menu', item);
    return response.data;
  },

  update: async (id: string, item: Partial<MenuItem>): Promise<MenuItem> => {
    const response = await api.put(`/menu/${id}`, item);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/menu/${id}`);
  },
};

// Restaurant Settings API (authenticated — admin use)
export const restaurantSettingsAPI = {
  get: async (): Promise<Restaurant> => {
    const response = await api.get('/restaurant-settings');
    return response.data;
  },

  save: async (data: Partial<Restaurant>): Promise<Restaurant> => {
    const response = await api.put('/restaurant-settings', data);
    return response.data;
  },
};

// Auth API (authenticated)
export const authAPI = {
  login: async (email: string, password: string, tenantId?: string): Promise<{ token: string; user?: any }> => {
    const response = await api.post('/auth/user-login', { email, password, tenantId });
    return response.data;
  },

  verify: async (): Promise<Admin> => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { oldPassword, newPassword });
  },
};

// Public API — no auth required, used by customer-facing menu page
export const publicAPI = {
  getTenantBySlug: async (slug: string): Promise<{ id: string; name: string; slug: string; subdomain?: string; status: string } | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/tenant?slug=${encodeURIComponent(slug)}`);
      return response.data;
    } catch {
      return null;
    }
  },

  getTenantBySubdomain: async (subdomain: string): Promise<{ id: string; name: string; slug: string; subdomain?: string; status: string } | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/tenant?subdomain=${encodeURIComponent(subdomain)}`);
      return response.data;
    } catch {
      return null;
    }
  },

  getMenuItems: async (tenantId: string): Promise<any[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/menu?tenantId=${encodeURIComponent(tenantId)}`);
      return response.data;
    } catch {
      return [];
    }
  },

  getCategories: async (tenantId: string): Promise<any[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/categories?tenantId=${encodeURIComponent(tenantId)}`);
      return response.data;
    } catch {
      return [];
    }
  },

  getRestaurantSettings: async (tenantId: string): Promise<Restaurant> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/restaurant-settings?tenantId=${encodeURIComponent(tenantId)}`);
      return response.data;
    } catch {
      return {} as Restaurant;
    }
  },
};

export default api;
