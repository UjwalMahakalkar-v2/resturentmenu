import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import api from '@/services/api';
import type { Tenant } from '@/types/tenant';
import TenantManagementTable from '@/components/TenantManagementTable';
import AddTenantForm from '@/components/AddTenantForm';
import EditTenantForm from '@/components/EditTenantForm';
import {
  Building2,
  Plus,
  LogOut,
  Search,
  Shield,
  TrendingUp,
  Ban,
  CheckCircle,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    premium: 0,
  });

  useEffect(() => {
    // Note: we intentionally do NOT clear admin_token here. The API interceptor already
    // forces the super-admin token on /super-admin routes, and wiping admin_token would
    // break an impersonated tenant tab that's open at the same time (shared localStorage).
    if (!isSuperAdmin()) {
      toast.error('Access denied: Super Admin only');
      navigate('/');
      return;
    }
    fetchTenants();
  }, []);

  useEffect(() => {
    let filtered = tenants;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) ||
        t.phone.includes(query) ||
        (t.subdomain && t.subdomain.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(t => t.plan === planFilter);
    }

    setFilteredTenants(filtered);
  }, [searchQuery, statusFilter, planFilter, tenants]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenants');
      const tenantsData = response.data.map((t: any) => ({
        ...t,
        plan: t.plan || t.subscriptionPlan || 'starter',
      }));

      const activeTenants = tenantsData.filter((t: any) => t.status !== 'deleted');
      setTenants(activeTenants);
      setFilteredTenants(activeTenants);

      setStats({
        total: activeTenants.length,
        active: activeTenants.filter((t: any) => t.status === 'active').length,
        suspended: activeTenants.filter((t: any) => t.status === 'suspended').length,
        premium: activeTenants.filter((t: any) => t.plan === 'premium').length,
      });
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/super-admin/login');
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Manage all tenants and system settings</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.name} ({user?.email})
              </span>
              <button onClick={handleLogout} className="btn-secondary text-sm flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tenants</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Building2 className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Tenants</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspended</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.suspended}</p>
              </div>
              <Ban className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Premium Plan</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.premium}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Tenant Grid Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
                Tenants
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({filteredTenants.length}{filteredTenants.length !== tenants.length ? ` of ${tenants.length}` : ''})
                </span>
              </h2>
            </div>

            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search name, slug, email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field py-2 text-sm">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="input-field py-2 text-sm">
                <option value="all">All Plans</option>
                <option value="starter">Starter</option>
                <option value="business">Business</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
              <Plus className="w-4 h-4" /> Add Tenant
            </button>
          </div>

          <TenantManagementTable
            tenants={filteredTenants}
            onRefresh={fetchTenants}
            onEdit={handleEditTenant}
          />
        </div>
      </div>

      {showAddForm && (
        <AddTenantForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchTenants}
        />
      )}

      {editingTenant && (
        <EditTenantForm
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSuccess={fetchTenants}
        />
      )}
    </div>
  );
}
