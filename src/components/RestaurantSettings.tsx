import { useState, useEffect } from 'react';
import { Restaurant } from '@/types';
import { restaurantService } from '@/services/restaurantService';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function RestaurantSettings() {
  const [formData, setFormData] = useState<Restaurant>(restaurantService.get());
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const [heroPreview, setHeroPreview] = useState('');

  useEffect(() => {
    setLogoPreview(formData.logo);
    setHeroPreview(formData.heroImage);
  }, [formData.logo, formData.heroImage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      restaurantService.save(formData);
      toast.success('Restaurant settings saved successfully');
      // Trigger a page reload to update the menu page
      window.dispatchEvent(new Event('restaurant-updated'));
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Restaurant Settings</h2>
        <p className="text-gray-600 mt-1">Manage your restaurant information and branding</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Enter restaurant name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tagline
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="input-field"
              placeholder="Your restaurant tagline"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
              placeholder="Enter phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              placeholder="Enter email address"
              required
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Restaurant Location *
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="input-field"
            placeholder="Enter full address"
            required
          />
        </div>

        {/* About */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            About Restaurant
          </label>
          <textarea
            value={formData.about}
            onChange={(e) => setFormData({ ...formData, about: e.target.value })}
            className="input-field min-h-[100px]"
            placeholder="Tell customers about your restaurant"
            rows={4}
          />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Restaurant Logo URL
          </label>
          <div className="flex gap-4">
            <input
              type="url"
              value={formData.logo}
              onChange={(e) => {
                setFormData({ ...formData, logo: e.target.value });
                setLogoPreview(e.target.value);
              }}
              className="input-field flex-1"
              placeholder="https://example.com/logo.png"
            />
            {logoPreview && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-cover"
                  onError={() => setLogoPreview('')}
                />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Recommended size: 100x100px
          </p>
        </div>

        {/* Hero Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hero Banner Image URL
          </label>
          <input
            type="url"
            value={formData.heroImage}
            onChange={(e) => {
              setFormData({ ...formData, heroImage: e.target.value });
              setHeroPreview(e.target.value);
            }}
            className="input-field"
            placeholder="https://example.com/hero-banner.jpg"
          />
          {heroPreview && (
            <div className="mt-3 relative h-48 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={heroPreview}
                alt="Hero preview"
                className="w-full h-full object-cover"
                onError={() => setHeroPreview('')}
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <p className="text-white font-semibold">Hero Banner Preview</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Recommended size: 1200x400px or wider
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={loading}
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
