import axios from 'axios';
import type { Category, MenuItem, Restaurant, Admin } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Categories API
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

// Menu Items API
export const menuAPI = {
  getAll: async (): Promise<MenuItem[]> => {
    const response = await api.get('/menu');
    return response.data;
  },
  
  getById: async (id: string): Promise<MenuItem> => {
    const response = await api.get(`/menu/${id}`);
    return response.data;
  },
  
  getByCategory: async (category: string): Promise<MenuItem[]> => {
    const response = await api.get(`/menu/category/${category}`);
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

// Restaurant API
export const restaurantAPI = {
  get: async (): Promise<Restaurant> => {
    const response = await api.get('/restaurant');
    return response.data;
  },
  
  update: async (data: Partial<Restaurant>): Promise<Restaurant> => {
    const response = await api.put('/restaurant', data);
    return response.data;
  },
};

// Auth API
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

export default api;
