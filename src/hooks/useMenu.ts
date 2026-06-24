import { useState, useEffect } from 'react';
import { tenantMenuAPI, tenantCategoryAPI, setTenantContext } from '@/services/tenantApi';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import toast from 'react-hot-toast';

const getCurrentTenantId = (): string | null => {
  const tenantId = localStorage.getItem('current_tenant_id');
  if (tenantId) return tenantId;

  const token = localStorage.getItem('admin_token');
  if (token) {
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.tenantId || null;
    } catch { /* not JSON token */ }
  }

  return null;
};

export const useMenu = (tenantId?: string) => {
  const [menuItems, setMenuItems] = useState<TenantMenuItem[]>([]);
  const [categories, setCategories] = useState<TenantCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeTenantId = tenantId || getCurrentTenantId();

  const fetchMenu = async () => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setTenantContext(activeTenantId, null);
      const [items, cats] = await Promise.all([
        tenantMenuAPI.getAll(activeTenantId),
        tenantCategoryAPI.getAll(activeTenantId),
      ]);
      setMenuItems(items);
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError('Failed to fetch menu data');
      console.error(err);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();

    const handleMenuUpdate = () => {
      fetchMenu();
    };

    window.addEventListener('menu-updated', handleMenuUpdate);
    return () => window.removeEventListener('menu-updated', handleMenuUpdate);
  }, [activeTenantId]);

  return {
    menuItems,
    categories,
    loading,
    error,
    refetch: fetchMenu,
  };
};

export const useCategories = (tenantId?: string) => {
  const [categories, setCategories] = useState<TenantCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTenantId = tenantId || getCurrentTenantId();

  const fetchCategories = async () => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setTenantContext(activeTenantId, null);
      const data = await tenantCategoryAPI.getAll(activeTenantId);
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Omit<TenantCategory, 'id' | 'tenantId'>) => {
    if (!activeTenantId) throw new Error('No tenant context');
    const newCategory = await tenantCategoryAPI.create(activeTenantId, category);
    setCategories([...categories, newCategory]);
    toast.success('Category added');
    return newCategory;
  };

  const updateCategory = async (id: string, updates: Partial<TenantCategory>) => {
    const updated = await tenantCategoryAPI.update(id, updates);
    setCategories(categories.map(cat => cat.id === id ? updated : cat));
    toast.success('Category updated');
    return updated;
  };

  const deleteCategory = async (id: string) => {
    await tenantCategoryAPI.delete(id);
    setCategories(categories.filter(cat => cat.id !== id));
    toast.success('Category deleted');
  };

  useEffect(() => {
    fetchCategories();
  }, [activeTenantId]);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
};

export const useMenuItems = (tenantId?: string) => {
  const [items, setItems] = useState<TenantMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTenantId = tenantId || getCurrentTenantId();

  const fetchItems = async () => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setTenantContext(activeTenantId, null);
      const data = await tenantMenuAPI.getAll(activeTenantId);
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<TenantMenuItem, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
    if (!activeTenantId) throw new Error('No tenant context');
    const newItem = await tenantMenuAPI.create(activeTenantId, item);
    setItems([...items, newItem]);
    toast.success('Menu item added');
    window.dispatchEvent(new Event('menu-updated'));
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<TenantMenuItem>) => {
    const updated = await tenantMenuAPI.update(id, updates);
    setItems(items.map(item => item.id === id ? updated : item));
    toast.success('Menu item updated');
    window.dispatchEvent(new Event('menu-updated'));
    return updated;
  };

  const deleteItem = async (id: string) => {
    await tenantMenuAPI.delete(id);
    setItems(items.filter(item => item.id !== id));
    toast.success('Menu item deleted');
    window.dispatchEvent(new Event('menu-updated'));
  };

  useEffect(() => {
    fetchItems();
  }, [activeTenantId]);

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  };
};
