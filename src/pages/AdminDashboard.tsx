import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LogOut, Plus, Edit, Trash2, Package, Settings,
  BarChart2, QrCode, Upload, Download, ChevronUp, ChevronDown
} from 'lucide-react';
import { useMenuItems, useCategories } from '@/hooks/useMenu';
import MenuItemForm from '@/components/MenuItemForm';
import RestaurantSettings from '@/components/RestaurantSettings';
import ThemeSettings from '@/components/ThemeSettings';
import AnalyticsTab from '@/components/AnalyticsTab';
import SocialLinksSettings from '@/components/admin/SocialLinksSettings';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import api from '@/services/api';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import toast from 'react-hot-toast';

type Tab = 'menu' | 'categories' | 'settings' | 'analytics' | 'qrcode';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { tenantSlug: slugFromUrl } = useParams<{ tenantSlug?: string }>();
  const { items, loading: itemsLoading, deleteItem, addItem, updateItem, refetch } = useMenuItems();
  const { categories, loading: categoriesLoading, deleteCategory, updateCategory, addCategory } = useCategories();
  const [activeTab, setActiveTab] = useState<Tab>('menu');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TenantMenuItem | null>(null);
  const [tenantSlug, setTenantSlug] = useState('');

  // Category form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️');
  const [addingCategory, setAddingCategory] = useState(false);

  // CSV import state
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    // Determine tenant slug: prefer URL param, then localStorage
    const slug = slugFromUrl || localStorage.getItem('current_tenant_slug') || '';
    setTenantSlug(slug);
  }, [navigate, slugFromUrl]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('current_tenant_id');
    localStorage.removeItem('current_tenant_slug');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: TenantMenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSaveItem = async (itemData: Omit<TenantMenuItem, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, itemData);
      } else {
        await addItem(itemData);
      }
      setIsFormOpen(false);
      setEditingItem(null);
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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const maxOrder = categories.reduce((m, c) => Math.max(m, c.order || 0), 0);
      await addCategory({
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        description: '',
        order: maxOrder + 1,
      } as Omit<TenantCategory, 'id' | 'tenantId'>);
      setNewCategoryName('');
      setNewCategoryIcon('🍽️');
    } catch (error) {
      console.error(error);
    } finally {
      setAddingCategory(false);
    }
  };

  // Move category up (lower order number)
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const sorted = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    const current = sorted[index];
    const above = sorted[index - 1];
    await Promise.all([
      updateCategory(current.id, { order: above.order }),
      updateCategory(above.id, { order: current.order }),
    ]);
  };

  // Move category down (higher order number)
  const handleMoveDown = async (index: number) => {
    const sorted = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (index === sorted.length - 1) return;
    const current = sorted[index];
    const below = sorted[index + 1];
    await Promise.all([
      updateCategory(current.id, { order: below.order }),
      updateCategory(below.id, { order: current.order }),
    ]);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (items.length === 0) { toast.error('No items to export'); return; }
    const headers = ['name', 'description', 'price', 'category', 'type', 'available', 'popular', 'image'];
    const rows = items.map(item => [
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      item.price,
      `"${(categories.find(c => c.id === item.category)?.name || item.category || '').replace(/"/g, '""')}"`,
      item.type || 'veg',
      item.available ? 'true' : 'false',
      item.popular ? 'true' : 'false',
      `"${(item.image || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} items`);
  };

  // Import CSV
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const parsedItems = lines.slice(1).map(line => {
        // Simple CSV parse (handles quoted fields)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === ',' && !inQuotes) { values.push(current); current = ''; }
          else { current += ch; }
        }
        values.push(current);

        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
        return obj;
      });

      const response = await api.post('/menu-bulk-import', { items: parsedItems });
      const { success, failed, errors } = response.data;
      toast.success(`Imported ${success} items${failed > 0 ? `, ${failed} failed` : ''}`);
      if (errors?.length > 0) console.warn('Import errors:', errors);
      await refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const stats = {
    totalItems: items.length,
    totalCategories: categories.length,
    popularItems: items.filter(item => item.popular).length,
    unavailableItems: items.filter(item => !item.available).length,
  };

  const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'menu', label: 'Menu Items', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <Package className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'qrcode', label: 'QR Code', icon: <QrCode className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Items', value: stats.totalItems, color: 'text-primary-600' },
            { label: 'Categories', value: stats.totalCategories, color: 'text-blue-600' },
            { label: 'Popular Items', value: stats.popularItems, color: 'text-amber-500' },
            { label: 'Unavailable', value: stats.unavailableItems, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex min-w-max">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* ── MENU ITEMS TAB ── */}
            {activeTab === 'menu' && (
              <div>
                <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                  <h2 className="text-xl font-semibold">Menu Items</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="btn-secondary flex items-center gap-2 text-sm"
                      title="Export all items as CSV"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <label
                      className={`btn-secondary flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}
                      title="Import items from CSV"
                    >
                      <Upload className="w-4 h-4" />
                      {importing ? 'Importing...' : 'Import CSV'}
                      <input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleImportCSV}
                        disabled={importing}
                      />
                    </label>
                    <button
                      onClick={handleAddItem}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                </div>

                {/* CSV format hint */}
                <div className="mb-4 text-xs text-gray-500 bg-gray-50 rounded p-3 border border-gray-200">
                  <strong>CSV import columns:</strong> name, description, price, category (name or id), type (veg/non-veg), available (true/false), popular (true/false), image (URL)
                </div>

                {itemsLoading ? (
                  <p className="text-center py-8 text-gray-500">Loading...</p>
                ) : items.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No items yet. Add your first menu item!</p>
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
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No img</div>
                                )}
                                <div>
                                  <span className="font-medium">{item.name}</span>
                                  {item.popular && <span className="ml-2 text-xs text-amber-600 font-medium">★ Popular</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {categories.find(c => c.id === item.category)?.name || item.category || 'N/A'}
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
                                <button onClick={() => handleEditItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteItem(item.id, item.name)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
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

            {/* ── CATEGORIES TAB ── */}
            {activeTab === 'categories' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Categories</h2>
                </div>

                {/* Add category inline form */}
                <form onSubmit={handleAddCategory} className="flex gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <input
                    type="text"
                    value={newCategoryIcon}
                    onChange={e => setNewCategoryIcon(e.target.value)}
                    className="input-field w-16 text-center text-xl"
                    placeholder="🍽️"
                    title="Emoji icon"
                  />
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="input-field flex-1"
                    placeholder="New category name (e.g. Desserts)"
                    required
                  />
                  <button type="submit" disabled={addingCategory} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                    {addingCategory ? 'Adding...' : 'Add Category'}
                  </button>
                </form>

                {categoriesLoading ? (
                  <p className="text-center py-8 text-gray-500">Loading...</p>
                ) : sortedCategories.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No categories yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sortedCategories.map((category, index) => (
                      <div key={category.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{category.icon || '🍽️'}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            <p className="text-xs text-gray-500">Order: {category.order}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Reorder buttons */}
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === sortedCategories.length - 1}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id, category.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-1"
                            title="Delete category"
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

            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'analytics' && <AnalyticsTab />}

            {/* ── QR CODE TAB ── */}
            {activeTab === 'qrcode' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">QR Code</h2>
                {tenantSlug ? (
                  <QRCodeGenerator tenantSlug={tenantSlug} />
                ) : (
                  <p className="text-gray-500 text-sm">
                    Could not determine your restaurant URL. Please log in via your restaurant link (e.g. <code>/your-slug/admin/login</code>).
                  </p>
                )}
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                <RestaurantSettings />
                <SocialLinksSettings />
                <ThemeSettings />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Item Form Modal */}
      <MenuItemForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
        onSave={handleSaveItem}
        categories={categories}
        editItem={editingItem}
      />
    </div>
  );
}
