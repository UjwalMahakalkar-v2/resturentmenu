import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import api from '@/services/api';
import type { Tenant } from '@/types/tenant';
import TenantManagementTable from '@/components/TenantManagementTable';
import AddTenantForm from '@/components/AddTenantForm';
import { 
  Building2, 
  Plus,
  LogOut,
  Search,
  Shield,
  TrendingUp,
  Ban,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    deleted: 0
  });

  useEffect(() => {
    if (!isSuperAdmin()) {
      toast.error('Access denied: Super Admin only');
      navigate('/');
      return;
    }
    fetchTenants();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTenants(tenants);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(query) ||
        tenant.slug.toLowerCase().includes(query) ||
        tenant.email.toLowerCase().includes(query) ||
        tenant.phone.includes(query) ||
        (tenant.subdomain && tenant.subdomain.toLowerCase().includes(query))
      );
      setFilteredTenants(filtered);
    }
  }, [searchQuery, tenants]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenants');
      // Normalize: backend stores subscriptionPlan, frontend type uses plan
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
        deleted: tenantsData.filter((t: any) => t.status === 'deleted').length,
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

  const handleEditTenant = (_tenant: Tenant) => {
    toast('Edit functionality coming soon', { icon: 'ℹ️' });
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
                <p className="text-sm text-gray-600">Growth</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">+{stats.total}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tenant Management</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add New Tenant
              </button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tenants by name, slug, email, phone, or subdomain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
            </div>
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
    </div>
  );
}
