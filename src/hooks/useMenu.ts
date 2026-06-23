import { useState, useEffect } from 'react';
import { menuAPI, categoryAPI } from '@/services/api';
import type { MenuItem, Category } from '@/types';
import toast from 'react-hot-toast';

export const useMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const [items, cats] = await Promise.all([
        menuAPI.getAll(),
        categoryAPI.getAll(),
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

    // Listen for menu updates from admin panel
    const handleMenuUpdate = () => {
      fetchMenu();
    };

    window.addEventListener('menu-updated', handleMenuUpdate);
    return () => window.removeEventListener('menu-updated', handleMenuUpdate);
  }, []);

  return {
    menuItems,
    categories,
    loading,
    error,
    refetch: fetchMenu,
  };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: Omit<Category, '_id' | 'id'>) => {
    try {
      const newCategory = await categoryAPI.create(category);
      setCategories([...categories, newCategory]);
      toast.success('Category added successfully');
      return newCategory;
    } catch (err) {
      console.error(err);
      toast.error('Failed to add category');
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const updated = await categoryAPI.update(id, updates);
      setCategories(categories.map(cat => cat.id === id ? updated : cat));
      toast.success('Category updated successfully');
      return updated;
    } catch (err) {
      console.error(err);
      toast.error('Failed to update category');
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await categoryAPI.delete(id);
      setCategories(categories.filter(cat => cat.id !== id));
      toast.success('Category deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete category');
      throw err;
    }
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

export const useMenuItems = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await menuAPI.getAll();
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<MenuItem, '_id' | 'id'>) => {
    try {
      const newItem = await menuAPI.create(item);
      setItems([...items, newItem]);
      toast.success('Menu item added successfully');
      // Trigger menu update event for customer page
      window.dispatchEvent(new Event('menu-updated'));
      return newItem;
    } catch (err) {
      console.error(err);
      toast.error('Failed to add menu item');
      throw err;
    }
  };

  const updateItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      const updated = await menuAPI.update(id, updates);
      setItems(items.map(item => item.id === id ? updated : item));
      toast.success('Menu item updated successfully');
      // Trigger menu update event for customer page
      window.dispatchEvent(new Event('menu-updated'));
      return updated;
    } catch (err) {
      console.error(err);
      toast.error('Failed to update menu item');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await menuAPI.delete(id);
      setItems(items.filter(item => item.id !== id));
      toast.success('Menu item deleted successfully');
      // Trigger menu update event for customer page
      window.dispatchEvent(new Event('menu-updated'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete menu item');
      throw err;
    }
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
