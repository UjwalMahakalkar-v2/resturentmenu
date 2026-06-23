import axios from 'axios';
import type { Category, MenuItem, Restaurant, Admin } from '@/types';
import { mockCategoryAPI, mockMenuAPI, mockAuthAPI } from './mockApi';

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';
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
    if (USE_MOCK_API) return mockCategoryAPI.getAll();
    const response = await api.get('/categories');
    return response.data;
  },
  
  getById: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
  
  create: async (category: Omit<Category, '_id' | 'id'>): Promise<Category> => {
    if (USE_MOCK_API) return mockCategoryAPI.create(category);
    const response = await api.post('/categories', category);
    return response.data;
  },
  
  update: async (id: string, category: Partial<Category>): Promise<Category> => {
    if (USE_MOCK_API) return mockCategoryAPI.update(id, category);
    const response = await api.put(`/categories/${id}`, category);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    if (USE_MOCK_API) return mockCategoryAPI.delete(id);
    await api.delete(`/categories/${id}`);
  },
};

// Menu Items API
export const menuAPI = {
  getAll: async (): Promise<MenuItem[]> => {
    if (USE_MOCK_API) return mockMenuAPI.getAll();
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
    if (USE_MOCK_API) return mockMenuAPI.create(item);
    const response = await api.post('/menu', item);
    return response.data;
  },
  
  update: async (id: string, item: Partial<MenuItem>): Promise<MenuItem> => {
    if (USE_MOCK_API) return mockMenuAPI.update(id, item);
    const response = await api.put(`/menu/${id}`, item);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    if (USE_MOCK_API) return mockMenuAPI.delete(id);
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
  login: async (username: string, password: string): Promise<{ token: string; admin?: Admin }> => {
    if (USE_MOCK_API) {
      const { token } = await mockAuthAPI.login(username, password);
      return { token };
    }
    const response = await api.post('/auth/login', { username, password });
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
