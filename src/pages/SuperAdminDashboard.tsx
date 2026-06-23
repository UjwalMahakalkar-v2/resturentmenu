import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { tenantAPI, subscriptionAPI, userAPI, auditLogAPI } from '@/services/tenantApi';
import type { Tenant, Subscription, User, AuditLog } from '@/types/tenant';
import { SUBSCRIPTION_PLANS } from '@/types/tenant';
import { 
  Building2, 
  Users, 
  Plus,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  Search,
  Calendar,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const { user, logout, isSuperAdmin } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'audit'>('tenants');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isSuperAdmin()) {
      window.location.href = '/';
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsData, usersData, logsData] = await Promise.all([
        tenantAPI.getAll(),
        userAPI.getAll(),
        auditLogAPI.getAll(),
      ]);

      setTenants(tenantsData);
      setUsers(usersData);
      setAuditLogs(logsData);

      // Fetch subscriptions for each tenant
      const subsMap: Record<string, Subscription> = {};
      for (const tenant of tenantsData) {
        const sub = await subscriptionAPI.getByTenantId(tenant.id);
        if (sub) {
          subsMap[tenant.id] = sub;
        }
      }
      setSubscriptions(subsMap);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendTenant = async (tenantId: string) => {
    if (!window.confirm('Are you sure you want to suspend this tenant?')) return;
    
    try {
      await tenantAPI.suspend(tenantId);
      toast.success('Tenant suspended successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleActivateTenant = async (tenantId: string) => {
    try {
      await tenantAPI.activate(tenantId);
      toast.success('Tenant activated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  const handleDeleteTenant = async (tenantId: string, hard: boolean = false) => {
    const message = hard 
      ? 'This will permanently delete all tenant data. This action cannot be undone!' 
      : 'This will soft delete the tenant. You can restore it later.';
    
    if (!window.confirm(message)) return;
    
    try {
      await tenantAPI.delete(tenantId, hard);
      toast.success(hard ? 'Tenant permanently deleted' : 'Tenant deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete tenant');
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'active').length,
    suspendedTenants: tenants.filter(t => t.status === 'suspended').length,
    totalUsers: users.length,
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
      {/* Header */}
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
              <button onClick={logout} className="btn-secondary text-sm">
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
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTenants}</p>
              </div>
              <Building2 className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Tenants</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.activeTenants}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Suspended</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.suspendedTenants}</p>
              </div>
              <Ban className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <Users className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('tenants')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'tenants'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tenants
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'users'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-6 py-4 font-medium ${
                  activeTab === 'audit'
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Audit Logs
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'tenants' && (
              <div>
                {/* Search and Actions */}
                <div className="flex items-center justify-between mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search tenants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                  <button
                    onClick={() => toast('Create tenant feature coming soon')}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Tenant
                  </button>
                </div>

                {/* Tenants Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renewal</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTenants.map((tenant) => {
                        const subscription = subscriptions[tenant.id];
                        return (
                          <tr key={tenant.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{tenant.name}</p>
                                <p className="text-sm text-gray-500">{tenant.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">{tenant.slug}</code>
                            </td>
                            <td className="px-4 py-4">
                              {subscription ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {SUBSCRIPTION_PLANS[subscription.plan].name}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">No subscription</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                                tenant.status === 'suspended' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {tenant.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {subscription && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(subscription.renewalDate).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                  <Edit className="w-4 h-4" />
                                </button>
                                {tenant.status === 'active' ? (
                                  <button
                                    onClick={() => handleSuspendTenant(tenant.id)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                                    title="Suspend"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleActivateTenant(tenant.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                                    title="Activate"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteTenant(tenant.id, false)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <p className="text-gray-600">User management coming soon...</p>
              </div>
            )}

            {activeTab === 'audit' && (
              <div>
                <div className="space-y-2">
                  {auditLogs.slice(0, 50).map((log) => (
                    <div key={log.id} className="bg-gray-50 rounded p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        User: {log.userId} | Resource: {log.resource} ({log.resourceId})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
