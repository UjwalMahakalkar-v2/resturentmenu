import { useState, useEffect } from 'react';
import { menuAPI, categoryAPI } from '@/services/api';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import toast from 'react-hot-toast';

export const useCategories = (_tenantId?: string) => {
  const [categories, setCategories] = useState<TenantCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();
      setCategories(data as TenantCategory[]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Omit<TenantCategory, 'id' | 'tenantId'>) => {
    const newCategory = await categoryAPI.create(category);
    setCategories(prev => [...prev, newCategory as TenantCategory]);
    toast.success('Category added');
    return newCategory as TenantCategory;
  };

  const updateCategory = async (id: string, updates: Partial<TenantCategory>) => {
    const updated = await categoryAPI.update(id, updates);
    setCategories(prev => prev.map(cat => cat.id === id ? updated as TenantCategory : cat));
    toast.success('Category updated');
    return updated as TenantCategory;
  };

  const deleteCategory = async (id: string) => {
    await categoryAPI.delete(id);
    setCategories(prev => prev.filter(cat => cat.id !== id));
    toast.success('Category deleted');
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
};

export const useMenuItems = (_tenantId?: string) => {
  const [items, setItems] = useState<TenantMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await menuAPI.getAll();
      setItems(data as TenantMenuItem[]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<TenantMenuItem, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
    const newItem = await menuAPI.create(item as any);
    setItems(prev => [...prev, newItem as TenantMenuItem]);
    toast.success('Menu item added');
    window.dispatchEvent(new Event('menu-updated'));
    return newItem as TenantMenuItem;
  };

  const updateItem = async (id: string, updates: Partial<TenantMenuItem>) => {
    const updated = await menuAPI.update(id, updates);
    setItems(prev => prev.map(item => item.id === id ? updated as TenantMenuItem : item));
    toast.success('Menu item updated');
    window.dispatchEvent(new Event('menu-updated'));
    return updated as TenantMenuItem;
  };

  const deleteItem = async (id: string) => {
    await menuAPI.delete(id);
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success('Menu item deleted');
    window.dispatchEvent(new Event('menu-updated'));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  };
};
