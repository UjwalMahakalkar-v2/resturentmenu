import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Edit, Trash2, Star, Package, Settings } from 'lucide-react';
import { useMenuItems, useCategories } from '@/hooks/useMenu';
import MenuItemForm from '@/components/MenuItemForm';
import RestaurantSettings from '@/components/RestaurantSettings';
import type { MenuItem } from '@/types';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { items, loading: itemsLoading, deleteItem, addItem, updateItem, refetch } = useMenuItems();
  const { categories, loading: categoriesLoading, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'settings'>('menu');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSaveItem = async (itemData: Omit<MenuItem, '_id' | 'id'>) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, itemData);
      } else {
        await addItem(itemData);
      }
      setIsFormOpen(false);
      setEditingItem(null);
      // Refetch to update the admin panel view
      await refetch();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteItem(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      try {
        await deleteCategory(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const stats = {
    totalItems: items.length,
    totalCategories: categories.length,
    popularItems: items.filter(item => item.popular).length,
    unavailableItems: items.filter(item => !item.available).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <Package className="w-12 h-12 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCategories}</p>
              </div>
              <Package className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Popular Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats.popularItems}</p>
              </div>
              <Star className="w-12 h-12 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unavailable</p>
                <p className="text-3xl font-bold text-gray-900">{stats.unavailableItems}</p>
              </div>
              <Package className="w-12 h-12 text-red-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'menu'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Menu Items
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'categories'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-4 font-medium flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'menu' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Menu Items</h2>
                  <button 
                    onClick={handleAddItem}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Item
                  </button>
                </div>

                {itemsLoading ? (
                  <p>Loading...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-12 h-12 rounded object-cover"
                                />
                                <span className="font-medium">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {categories.find(c => c.id === item.category)?.name || 'N/A'}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium">₹{item.price}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.type === 'veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.available ? 'Available' : 'Unavailable'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditItem(item)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit item"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'categories' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Categories</h2>
                  <button className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Category
                  </button>
                </div>

                {categoriesLoading ? (
                  <p>Loading...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <div key={category.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          <p className="text-sm text-gray-600">Order: {category.order}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id, category.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <RestaurantSettings />
            )}
          </div>
        </div>
      </div>

      {/* Menu Item Form Modal */}
      <MenuItemForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        categories={categories}
        editItem={editingItem}
      />
    </div>
  );
}
