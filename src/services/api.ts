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
  // Single combined call for the storefront: tenant + settings + categories + menu.
  // Resolve by slug (path-based access) or subdomain (subdomain-based access).
  getBootstrap: async (params: { slug?: string; subdomain?: string }): Promise<{ tenant: any; settings: any; categories: any[]; menu: any[] } | null> => {
    try {
      const q = new URLSearchParams();
      if (params.slug) q.set('slug', params.slug);
      if (params.subdomain) q.set('subdomain', params.subdomain);
      q.set('_t', String(Date.now()));
      const response = await axios.get(`${API_BASE_URL}/public/bootstrap?${q.toString()}`);
      return response.data;
    } catch {
      return null;
    }
  },

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
      const response = await axios.get(`${API_BASE_URL}/public/restaurant-settings?tenantId=${encodeURIComponent(tenantId)}&_t=${Date.now()}`);
      return response.data;
    } catch {
      return {} as Restaurant;
    }
  },
};

// Staff API (authenticated)
export const staffAPI = {
  getAll: async () => {
    const response = await api.get('/staff');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  },
  create: async (data: Record<string, any>) => {
    const response = await api.post('/staff', data);
    return response.data;
  },
  update: async (id: string, data: Record<string, any>) => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data;
  },
  deactivate: async (id: string) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },
};

// Attendance API (authenticated)
export const attendanceAPI = {
  getByDate: async (date: string) => {
    const response = await api.get(`/attendance?date=${encodeURIComponent(date)}`);
    return response.data;
  },
  getByRange: async (from: string, to: string, staffId?: string) => {
    const q = staffId
      ? `staffId=${encodeURIComponent(staffId)}&from=${from}&to=${to}`
      : `from=${from}&to=${to}`;
    const response = await api.get(`/attendance?${q}`);
    return response.data;
  },
  mark: async (data: { staffId: string; date: string; status: string; checkIn?: string; checkOut?: string; notes?: string }) => {
    const response = await api.post('/attendance', data);
    return response.data;
  },
};

// Payroll API (authenticated)
export const payrollAPI = {
  getByMonth: async (month: string) => {
    const response = await api.get(`/payroll?month=${encodeURIComponent(month)}`);
    return response.data;
  },
  getByStaff: async (staffId: string) => {
    const response = await api.get(`/payroll?staffId=${encodeURIComponent(staffId)}`);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/payroll');
    return response.data;
  },
  generate: async (data: Record<string, any>) => {
    const response = await api.post('/payroll', data);
    return response.data;
  },
  markPaid: async (staffId: string, month: string, paidDate: string, notes?: string) => {
    const response = await api.put('/payroll', { staffId, month, status: 'paid', paidDate, notes: notes || '' });
    return response.data;
  },
};

// POS API (authenticated)
export const posAPI = {
  getSettings: async () => {
    const response = await api.get('/pos/settings');
    return response.data;
  },
  updateSettings: async (data: Record<string, any>) => {
    const response = await api.put('/pos/settings', data);
    return response.data;
  },
  getSections: async () => {
    const response = await api.get('/pos/sections');
    return response.data;
  },
  createSection: async (data: Record<string, any>) => {
    const response = await api.post('/pos/sections', data);
    return response.data;
  },
  updateSection: async (id: string, data: Record<string, any>) => {
    const response = await api.put(`/pos/sections/${id}`, data);
    return response.data;
  },
  deleteSection: async (id: string) => {
    await api.delete(`/pos/sections/${id}`);
  },
  getTables: async (sectionId?: string) => {
    const q = sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : '';
    const response = await api.get(`/pos/tables${q}`);
    return response.data;
  },
  createTable: async (data: Record<string, any>) => {
    const response = await api.post('/pos/tables', data);
    return response.data;
  },
  updateTable: async (id: string, data: Record<string, any>) => {
    const response = await api.put(`/pos/tables/${id}`, data);
    return response.data;
  },
  deleteTable: async (id: string) => {
    await api.delete(`/pos/tables/${id}`);
  },
  getOrders: async (params?: { status?: string; date?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.date) q.set('date', params.date);
    if (params?.limit) q.set('limit', String(params.limit));
    const response = await api.get(`/pos/orders${q.toString() ? '?' + q.toString() : ''}`);
    return response.data;
  },
  createOrder: async (data: Record<string, any>) => {
    const response = await api.post('/pos/orders', data);
    return response.data;
  },
  updateOrder: async (id: string, data: Record<string, any>) => {
    const response = await api.put(`/pos/orders/${id}`, data);
    return response.data;
  },
  deleteOrder: async (id: string) => {
    await api.delete(`/pos/orders/${id}`);
  },
};

// Reservations API (admin — authenticated)
export const reservationsAPI = {
  getAll: async (params?: { date?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.date)   q.set('date', params.date);
    if (params?.status) q.set('status', params.status);
    const response = await api.get(`/reservations${q.toString() ? '?' + q.toString() : ''}`);
    return response.data;
  },
  update: async (id: string, data: Record<string, any>) => {
    const response = await api.put(`/reservations/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/reservations/${id}`);
  },
};

// Public Reservations API (no auth — customer-facing)
export const publicReservationsAPI = {
  create: async (data: {
    tenantId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    reservationDate: string;
    reservationTime: string;
    partySize: number;
    notes?: string;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/public/reservations`, data);
    return response.data;
  },
};

// Inventory & Finance API (authenticated; gated by tenants.inventory_enabled)
export const inventoryAPI = {
  getSettings: async () => (await api.get('/inventory/settings')).data,
  updateSettings: async (data: Record<string, any>) => (await api.put('/inventory/settings', data)).data,
  getItems: async () => (await api.get('/inventory/items')).data,
  createItem: async (data: Record<string, any>) => (await api.post('/inventory/items', data)).data,
  updateItem: async (id: string, data: Record<string, any>) => (await api.put(`/inventory/items/${id}`, data)).data,
  deleteItem: async (id: string) => { await api.delete(`/inventory/items/${id}`); },
  getCategories: async () => (await api.get('/inventory/categories')).data,
  createCategory: async (data: Record<string, any>) => (await api.post('/inventory/categories', data)).data,
  getMovements: async (params?: { type?: string; itemId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.itemId) q.set('itemId', params.itemId);
    if (params?.limit) q.set('limit', String(params.limit));
    return (await api.get(`/inventory/movements${q.toString() ? '?' + q.toString() : ''}`)).data;
  },
  recordMovement: async (data: Record<string, any>) => (await api.post('/inventory/movements', data)).data,
  getRecipe: async (menuItemId: string) => (await api.get(`/inventory/recipes?menuItemId=${encodeURIComponent(menuItemId)}`)).data,
  saveRecipe: async (menuItemId: string, lines: any[]) => (await api.put('/inventory/recipes', { menuItemId, lines })).data,
  // Suppliers
  getSuppliers: async () => (await api.get('/inventory/suppliers')).data,
  createSupplier: async (data: Record<string, any>) => (await api.post('/inventory/suppliers', data)).data,
  updateSupplier: async (id: string, data: Record<string, any>) => (await api.put(`/inventory/suppliers/${id}`, data)).data,
  deleteSupplier: async (id: string) => { await api.delete(`/inventory/suppliers/${id}`); },
  // Purchase orders
  getPurchaseOrders: async (status?: string) => (await api.get(`/inventory/purchase-orders${status ? '?status=' + status : ''}`)).data,
  createPurchaseOrder: async (data: Record<string, any>) => (await api.post('/inventory/purchase-orders', data)).data,
  updatePurchaseOrder: async (id: string, data: Record<string, any>) => (await api.put(`/inventory/purchase-orders/${id}`, data)).data,
  deletePurchaseOrder: async (id: string) => { await api.delete(`/inventory/purchase-orders/${id}`); },
  // Expenses
  getExpenses: async (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    return (await api.get(`/inventory/expenses${q.toString() ? '?' + q.toString() : ''}`)).data;
  },
  createExpense: async (data: Record<string, any>) => (await api.post('/inventory/expenses', data)).data,
  deleteExpense: async (id: string) => { await api.delete(`/inventory/expenses/${id}`); },
  // Finance / P&L
  getFinance: async (range: string) => (await api.get(`/inventory/finance?range=${encodeURIComponent(range)}`)).data,
};

export default api;
