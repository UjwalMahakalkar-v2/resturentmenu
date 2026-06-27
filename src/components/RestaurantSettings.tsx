import { useState, useEffect } from 'react';
import { Restaurant } from '@/types';
import { restaurantService } from '@/services/restaurantService';
import ImageUploader from './ImageUploader';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function RestaurantSettings() {
  const [formData, setFormData] = useState<Restaurant>({
    name: '',
    tagline: '',
    logo: '',
    heroImage: '',
    phone: '',
    email: '',
    location: '',
    about: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const r = await restaurantService.get();
      setFormData(r);
    };
    load();
  }, []);

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
      await restaurantService.save(formData);
      toast.success('Restaurant settings saved successfully');
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
        <ImageUploader
          value={formData.logo}
          onChange={(url) => setFormData({ ...formData, logo: url })}
          folder="logo"
          label="Restaurant Logo"
          hint="Recommended: 200×200 px · JPG, PNG, WEBP · Max 5 MB"
          aspectRatio="square"
        />

        {/* Hero Banner */}
        <ImageUploader
          value={formData.heroImage}
          onChange={(url) => setFormData({ ...formData, heroImage: url })}
          folder="banner"
          label="Hero Banner Image"
          hint="Recommended: 1200×400 px or wider · JPG, PNG, WEBP · Max 5 MB"
          aspectRatio="banner"
        />

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
