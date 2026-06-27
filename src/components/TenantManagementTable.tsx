import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  ExternalLink,
  MoreVertical,
  UserCheck,
  ShoppingCart,
} from 'lucide-react';
import type { Tenant } from '@/types/tenant';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface TenantManagementTableProps {
  tenants: Tenant[];
  onRefresh: () => void;
  onEdit: (tenant: Tenant) => void;
}

export default function TenantManagementTable({ tenants, onRefresh, onEdit }: TenantManagementTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuspend = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to suspend ${tenant.name}?`)) return;
    
    setLoading(tenant.id);
    setShowActions(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { status: 'suspended' });
      toast.success(`${tenant.name} has been suspended`);
      await onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend tenant');
    } finally {
      setLoading(null);
    }
  };

  const handleActivate = async (tenant: Tenant) => {
    setLoading(tenant.id);
    setShowActions(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { status: 'active' });
      toast.success(`${tenant.name} has been activated`);
      await onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate tenant');
    } finally {
      setLoading(null);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    setLoading(tenant.id);
    setShowActions(null);
    try {
      const response = await api.post('/impersonate', { tenantId: tenant.id });
      const { token, tenant: t } = response.data;
      // Store token and tenant info for the admin dashboard
      localStorage.setItem('admin_token', token);
      localStorage.setItem('current_tenant_id', t.id);
      localStorage.setItem('current_tenant_slug', t.slug);
      toast.success(`Now logged in as ${tenant.name}`);
      // Open admin dashboard in a new tab
      window.open(`/${t.slug}/admin/dashboard`, '_blank');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to impersonate tenant');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to delete ${tenant.name}? This action cannot be undone.`)) return;
    
    const confirmText = prompt('Type "DELETE" to confirm:');
    if (confirmText !== 'DELETE') {
      toast.error('Deletion cancelled');
      return;
    }

    setLoading(tenant.id);
    setShowActions(null);
    try {
      await api.delete(`/tenants/${tenant.id}`);
      toast.success(`${tenant.name} has been deleted`);
      await onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tenant');
    } finally {
      setLoading(null);
    }
  };

  const handleTogglePOS = async (tenant: Tenant) => {
    const newVal = !tenant.posEnabled;
    setLoading(tenant.id);
    setShowActions(null);
    try {
      await api.patch(`/tenants/${tenant.id}`, { posEnabled: newVal ? 1 : 0 });
      toast.success(`POS ${newVal ? 'enabled' : 'disabled'} for ${tenant.name}`);
      await onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle POS');
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
      deleted: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const styles = {
      starter: 'bg-blue-100 text-blue-800',
      business: 'bg-purple-100 text-purple-800',
      premium: 'bg-amber-100 text-amber-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[plan as keyof typeof styles] || styles.starter}`}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Restaurant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Slug/Subdomain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center min-w-[200px]">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-xs text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                    {tenant.subdomain || tenant.slug}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{tenant.ownerName || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 min-w-[180px]">
                    <div className="flex items-center text-xs text-gray-500">
                      <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{tenant.email}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                      {tenant.phone}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(tenant.status)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getPlanBadge(tenant.plan)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(tenant.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                  <div className="relative inline-block" ref={showActions === tenant.id ? dropdownRef : null}>
                    <button
                      onClick={() => setShowActions(showActions === tenant.id ? null : tenant.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      disabled={loading === tenant.id}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    
                    {showActions === tenant.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                        <div className="py-1">
                          <a
                            href={`/${tenant.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Menu
                          </a>
                          <a
                            href={`/${tenant.slug}/admin/dashboard`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Dashboard
                          </a>
                          <button
                            onClick={() => {
                              onEdit(tenant);
                              setShowActions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                          {tenant.status === 'active' && (
                            <button
                              onClick={() => handleImpersonate(tenant)}
                              className="flex items-center w-full px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Login As Tenant
                            </button>
                          )}
                          <button
                            onClick={() => handleTogglePOS(tenant)}
                            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-amber-50 ${tenant.posEnabled ? 'text-amber-700' : 'text-gray-600'}`}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {tenant.posEnabled ? 'Disable POS' : 'Enable POS'}
                          </button>
                          {tenant.status === 'active' ? (
                            <button
                              onClick={() => {
                                handleSuspend(tenant);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                handleActivate(tenant);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleDelete(tenant);
                              setShowActions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
      
      {tenants.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new tenant.</p>
        </div>
      )}
    </div>
  );
}
