import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LogOut, Plus, Settings, BarChart2, QrCode,
  Upload, Download, GripVertical, Package, Briefcase, ShoppingCart, CalendarClock,
} from 'lucide-react';
import { useMenuItems, useCategories } from '@/hooks/useMenu';
import MenuItemForm from '@/components/MenuItemForm';
import RestaurantSettings from '@/components/RestaurantSettings';
import ThemeSettings from '@/components/ThemeSettings';
import AnalyticsTab from '@/components/AnalyticsTab';
import SocialLinksSettings from '@/components/admin/SocialLinksSettings';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import CategoryManager from '@/components/admin/CategoryManager';
import MenuByCategory from '@/components/admin/MenuByCategory';
import ManagementDashboard from '@/components/management/ManagementDashboard';
import POSDashboard from '@/components/pos/POSDashboard';
import ReservationManager from '@/components/reservations/ReservationManager';
import api from '@/services/api';
import { restaurantSettingsAPI } from '@/services/api';
import { applyTheme } from '@/contexts/ThemeContext';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import toast from 'react-hot-toast';

type Tab = 'menu' | 'categories' | 'analytics' | 'qrcode' | 'settings' | 'management' | 'pos' | 'reservations';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { tenantSlug: slugFromUrl } = useParams<{ tenantSlug?: string }>();
  const { items, loading: itemsLoading, deleteItem, addItem, updateItem, refetch } = useMenuItems();
  const { categories, loading: categoriesLoading, deleteCategory, updateCategory, addCategory } = useCategories();
  const [activeTab, setActiveTab] = useState<Tab>('menu');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TenantMenuItem | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>();
  const [tenantSlug, setTenantSlug] = useState('');
  const [itemDragMode, setItemDragMode] = useState(false);

  // CSV import state
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login'); return; }
    const slug = slugFromUrl || localStorage.getItem('current_tenant_slug') || '';
    setTenantSlug(slug);
    // Apply tenant's saved theme immediately so admin panel reflects the correct brand colors
    restaurantSettingsAPI.get().then(data => {
      if (data?.theme) applyTheme(data.theme);
    }).catch(() => {});
  }, [navigate, slugFromUrl]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('current_tenant_id');
    localStorage.removeItem('current_tenant_slug');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const handleAddItem = (categoryId?: string) => {
    setEditingItem(null);
    setDefaultCategoryId(categoryId);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: TenantMenuItem) => {
    setEditingItem(item);
    setDefaultCategoryId(undefined);
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
      setDefaultCategoryId(undefined);
      await refetch();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      try { await deleteItem(id); } catch { /* handled in hook */ }
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (window.confirm(`Delete category "${name}"? Items in it will become uncategorized.`)) {
      try { await deleteCategory(id); } catch { /* handled in hook */ }
    }
  };

  const handleReorderCategories = async (reordered: TenantCategory[]) => {
    await Promise.all(reordered.map(c => updateCategory(c.id, { order: c.order })));
  };

  const handleReorderItems = async (_catId: string, reordered: TenantMenuItem[]) => {
    await Promise.all(reordered.map(item => updateItem(item.id, { sortOrder: item.sortOrder })));
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
    popularItems: items.filter(i => i.popular).length,
    unavailableItems: items.filter(i => !i.available).length,
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'menu', label: 'Menu Items', icon: <Package className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <Package className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'qrcode', label: 'QR Code', icon: <QrCode className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'management', label: 'Management', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'pos', label: 'POS', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'reservations', label: 'Reservations', icon: <CalendarClock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors">
              <LogOut className="w-5 h-5" /> Logout
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
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* ── MENU ITEMS TAB ── */}
            {activeTab === 'menu' && (
              <div>
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold">Menu Items</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Drag mode toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none mr-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Reorder</span>
                      <div className="relative">
                        <input type="checkbox" checked={itemDragMode} onChange={e => setItemDragMode(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                      </div>
                    </label>
                    <button onClick={handleExportCSV} className="btn-secondary flex items-center gap-2 text-sm">
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <label className={`btn-secondary flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload className="w-4 h-4" />
                      {importing ? 'Importing...' : 'Import CSV'}
                      <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={importing} />
                    </label>
                    <button onClick={() => handleAddItem()} className="btn-primary flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  </div>
                </div>

                {itemDragMode && (
                  <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4">
                    Drag items within a category to reorder. Order saves automatically on drop. To move an item to another category, use the Edit button.
                  </p>
                )}

                <div className="mb-4 text-xs text-gray-500 bg-gray-50 rounded p-3 border border-gray-200">
                  <strong>CSV import columns:</strong> name, description, price, category (name or id), type (veg/non-veg), available (true/false), popular (true/false), image (URL)
                </div>

                {itemsLoading || categoriesLoading ? (
                  <p className="text-center py-8 text-gray-500">Loading...</p>
                ) : (
                  <MenuByCategory
                    items={items}
                    categories={categories}
                    dragMode={itemDragMode}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onAddToCategory={handleAddItem}
                    onReorderItems={handleReorderItems}
                  />
                )}
              </div>
            )}

            {/* ── CATEGORIES TAB ── */}
            {activeTab === 'categories' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Categories</h2>
                </div>
                <CategoryManager
                  categories={categories}
                  loading={categoriesLoading}
                  onAdd={async (cat) => {
                    await addCategory(cat as Omit<TenantCategory, 'id' | 'tenantId'>);
                  }}
                  onDelete={handleDeleteCategory}
                  onReorder={handleReorderCategories}
                />
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

            {/* ── MANAGEMENT TAB ── */}
            {activeTab === 'management' && <ManagementDashboard />}

            {/* ── POS TAB ── */}
            {activeTab === 'pos' && <POSDashboard />}

            {/* ── RESERVATIONS TAB ── */}
            {activeTab === 'reservations' && <ReservationManager />}
          </div>
        </div>
      </div>

      {/* Menu Item Form Modal */}
      <MenuItemForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingItem(null); setDefaultCategoryId(undefined); }}
        onSave={handleSaveItem}
        categories={categories}
        editItem={editingItem}
        defaultCategoryId={defaultCategoryId}
      />
    </div>
  );
}
