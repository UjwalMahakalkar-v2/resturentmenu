import { useState } from 'react';
import {
  Building2, Mail, Phone, MapPin, Calendar,
  Eye, Edit, Trash2, Ban, CheckCircle,
  ShoppingCart, LayoutDashboard, Boxes,
} from 'lucide-react';
import type { Tenant } from '@/types/tenant';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface TenantManagementTableProps {
  tenants: Tenant[];
  onRefresh: () => void;
  onEdit: (tenant: Tenant) => void;
}

// Generate a consistent color from the tenant name
function avatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
    'from-green-500 to-emerald-600',
    'from-red-500 to-rose-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const STATUS_CFG: Record<string, { bg: string; dot: string; label: string }> = {
  active:    { bg: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  label: 'Active' },
  suspended: { bg: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500',  label: 'Suspended' },
  inactive:  { bg: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   label: 'Inactive' },
  deleted:   { bg: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    label: 'Deleted' },
};

const PLAN_CFG: Record<string, { bg: string; label: string }> = {
  starter:  { bg: 'bg-blue-100 text-blue-700',   label: 'Starter' },
  business: { bg: 'bg-purple-100 text-purple-700', label: 'Business' },
  premium:  { bg: 'bg-amber-100 text-amber-700', label: 'Premium' },
};

export default function TenantManagementTable({ tenants, onRefresh, onEdit }: TenantManagementTableProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSuspend = async (tenant: Tenant) => {
    if (!confirm(`Suspend ${tenant.name}?`)) return;
    setLoading(tenant.id);
    try {
      await api.patch(`/tenants/${tenant.id}`, { status: 'suspended' });
      toast.success(`${tenant.name} suspended`);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setLoading(null); }
  };

  const handleActivate = async (tenant: Tenant) => {
    setLoading(tenant.id);
    try {
      await api.patch(`/tenants/${tenant.id}`, { status: 'active' });
      toast.success(`${tenant.name} activated`);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setLoading(null); }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    setLoading(tenant.id);
    try {
      const response = await api.post('/impersonate', { tenantId: tenant.id });
      const { token, tenant: t } = response.data;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('current_tenant_id', t.id);
      localStorage.setItem('current_tenant_slug', t.slug);
      toast.success(`Logged in as ${tenant.name}`);
      window.open(`/${t.slug}/admin/dashboard`, '_blank');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to login as tenant');
    } finally { setLoading(null); }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`Delete ${tenant.name}? This cannot be undone.`)) return;
    if (prompt('Type "DELETE" to confirm:') !== 'DELETE') { toast.error('Cancelled'); return; }
    setLoading(tenant.id);
    try {
      await api.delete(`/tenants/${tenant.id}`);
      toast.success(`${tenant.name} deleted`);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setLoading(null); }
  };

  const handleTogglePOS = async (tenant: Tenant) => {
    const newVal = !tenant.posEnabled;
    setLoading(tenant.id);
    try {
      await api.patch(`/tenants/${tenant.id}`, { posEnabled: newVal ? 1 : 0 });
      toast.success(`POS ${newVal ? 'enabled' : 'disabled'} for ${tenant.name}`);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setLoading(null); }
  };

  const handleToggleInventory = async (tenant: Tenant) => {
    const newVal = !tenant.inventoryEnabled;
    setLoading(tenant.id);
    try {
      await api.patch(`/tenants/${tenant.id}`, { inventoryEnabled: newVal ? 1 : 0 });
      toast.success(`Inventory ${newVal ? 'enabled' : 'disabled'} for ${tenant.name}`);
      await onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally { setLoading(null); }
  };

  if (tenants.length === 0) {
    return (
      <div className="text-center py-16">
        <Building2 className="mx-auto h-14 w-14 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No tenants found</p>
        <p className="text-sm text-gray-400 mt-1">Add your first tenant to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {tenants.map(tenant => {
        const status = STATUS_CFG[tenant.status] ?? STATUS_CFG.inactive;
        const plan   = PLAN_CFG[tenant.plan]     ?? PLAN_CFG.starter;
        const busy   = loading === tenant.id;
        const grad   = avatarColor(tenant.name);
        const joinDate = new Date(tenant.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        return (
          <div
            key={tenant.id}
            className={`relative flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden ${busy ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {/* Top color stripe */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${grad}`} />

            <div className="p-5 flex-1 flex flex-col">
              {/* Avatar + name row */}
              <div className="flex items-start gap-3 mb-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                  {initials(tenant.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{tenant.name}</h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{tenant.subdomain || tenant.slug}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${plan.bg}`}>
                      {plan.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5 mb-4">
                {tenant.email && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                    <Mail className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{tenant.email}</span>
                  </div>
                )}
                {tenant.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    <span>{tenant.phone}</span>
                  </div>
                )}
                {tenant.address && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{tenant.address}</span>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 mb-4 py-2.5 border-t border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{joinDate}</span>
                </div>
                {tenant.posEnabled && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 font-medium ml-auto">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    POS On
                  </div>
                )}
              </div>

              {/* Primary action: Open Dashboard */}
              <button
                onClick={() => handleImpersonate(tenant)}
                disabled={tenant.status !== 'active'}
                className="w-full flex items-center justify-center gap-2 py-2 mb-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Open Dashboard
              </button>

              {/* Secondary actions row */}
              <div className="grid grid-cols-4 gap-1.5">
                <a
                  href={`/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="View Menu"
                >
                  <Eye className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => onEdit(tenant)}
                  className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => tenant.status === 'active' ? handleSuspend(tenant) : handleActivate(tenant)}
                  className={`flex items-center justify-center py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    tenant.status === 'active'
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-green-700 bg-green-50 hover:bg-green-100'
                  }`}
                  title={tenant.status === 'active' ? 'Suspend' : 'Activate'}
                >
                  {tenant.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleDelete(tenant)}
                  className="flex items-center justify-center py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* POS toggle */}
              <button
                onClick={() => handleTogglePOS(tenant)}
                className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  tenant.posEnabled
                    ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                    : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {tenant.posEnabled ? 'Disable POS' : 'Enable POS'}
              </button>

              {/* Inventory toggle */}
              <button
                onClick={() => handleToggleInventory(tenant)}
                className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  tenant.inventoryEnabled
                    ? 'border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100'
                    : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                {tenant.inventoryEnabled ? 'Disable Inventory' : 'Enable Inventory'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
