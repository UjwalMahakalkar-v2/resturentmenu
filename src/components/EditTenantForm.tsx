import { useState } from 'react';
import { X, Building2, Mail, Phone, MapPin } from 'lucide-react';
import type { Tenant, SubscriptionPlan, TenantStatus } from '@/types/tenant';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface EditTenantFormProps {
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTenantForm({ tenant, onClose, onSuccess }: EditTenantFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant.name,
    email: tenant.email,
    phone: tenant.phone,
    address: tenant.address || '',
    status: tenant.status as TenantStatus,
    plan: (tenant.plan || 'starter') as SubscriptionPlan,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error('Name, email, and phone are required');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/tenants/${tenant.id}`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        status: formData.status,
        subscriptionPlan: formData.plan,
      });
      toast.success(`"${formData.name}" updated successfully`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Tenant</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{tenant.slug}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Restaurant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field pl-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="input-field">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
              <select name="plan" value={formData.plan} onChange={handleChange} className="input-field">
                <option value="starter">Starter - ₹999/mo</option>
                <option value="business">Business - ₹2999/mo</option>
                <option value="premium">Premium - ₹5999/mo</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field pl-9"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field pl-9"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input-field pl-9 min-h-[72px]"
                placeholder="123 Main Street, City, State - 400001"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
