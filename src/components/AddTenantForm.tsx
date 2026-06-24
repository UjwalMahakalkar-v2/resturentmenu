import { useState } from 'react';
import { X, Building2, Globe, User, Mail, Phone, Lock, MapPin } from 'lucide-react';
import type { SubscriptionPlan } from '@/types/tenant';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface AddTenantFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTenantForm({ onClose, onSuccess }: AddTenantFormProps) {
  const [loading, setLoading] = useState(false);
  const [useSubdomain, setUseSubdomain] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subdomain: '',
    email: '',
    phone: '',
    address: '',
    plan: 'starter' as SubscriptionPlan,
    adminUsername: '',
    adminPassword: '',
    adminEmail: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === 'name' && !formData.slug) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
      
      // Auto-generate subdomain if enabled
      if (useSubdomain) {
        setFormData(prev => ({ ...prev, subdomain: `${slug}.menumate.in` }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.slug || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.adminUsername || !formData.adminPassword || !formData.adminEmail) {
      toast.error('Please fill in admin credentials');
      return;
    }

    if (useSubdomain && !formData.subdomain) {
      toast.error('Please provide a subdomain');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/tenants', {
        name: formData.name,
        slug: formData.slug,
        subdomain: useSubdomain ? formData.subdomain : undefined,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        subscriptionPlan: formData.plan,
        adminName: formData.adminUsername,
        adminPassword: formData.adminPassword,
        adminEmail: formData.adminEmail,
      });
      const result = response.data;

      toast.success(`Tenant "${result.name}" created successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New Tenant</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Restaurant Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Restaurant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Restaurant Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="Pizza Palace"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="pizza-palace"
                  pattern="[a-z0-9-]+"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL: /{formData.slug || 'your-slug'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Plan *
                </label>
                <select
                  name="plan"
                  value={formData.plan}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="starter">Starter - ₹999/mo</option>
                  <option value="business">Business - ₹2999/mo</option>
                  <option value="premium">Premium - ₹5999/mo</option>
                </select>
              </div>

              {/* Subdomain Option */}
              <div className="md:col-span-2">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="useSubdomain"
                    checked={useSubdomain}
                    onChange={(e) => {
                      setUseSubdomain(e.target.checked);
                      if (e.target.checked && formData.slug) {
                        setFormData(prev => ({ ...prev, subdomain: `${prev.slug}.menumate.in` }));
                      } else {
                        setFormData(prev => ({ ...prev, subdomain: '' }));
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="useSubdomain" className="ml-2 block text-sm font-medium text-gray-700">
                    Enable Custom Subdomain
                  </label>
                </div>
                {useSubdomain && (
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="pizza-palace.menumate.in"
                      pattern="[a-z0-9-]+\.menumate\.in"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="owner@pizzapalace.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="input-field pl-10 min-h-[80px]"
                    placeholder="123 Main Street, City, State - 400001"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Admin Credentials */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Username *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="adminUsername"
                    value={formData.adminUsername}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="pizzaadmin"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="adminEmail"
                    value={formData.adminEmail}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="admin@pizzapalace.com"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
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
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
