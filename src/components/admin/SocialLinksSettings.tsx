import { useState, useEffect } from 'react';
import { Save, MessageCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Restaurant } from '@/types';

interface SocialLinksSettingsProps {
  restaurant: Restaurant;
  onUpdate: (data: Partial<Restaurant>) => Promise<void>;
}

export default function SocialLinksSettings({ restaurant, onUpdate }: SocialLinksSettingsProps) {
  const [whatsapp, setWhatsapp] = useState(restaurant.socialMedia?.whatsapp || '');
  const [whatsappMessage, setWhatsappMessage] = useState(restaurant.socialMedia?.whatsappMessage || '');
  const [instagram, setInstagram] = useState(restaurant.socialMedia?.instagram || '');
  const [enableWhatsapp, setEnableWhatsapp] = useState(restaurant.socialMedia?.enableWhatsapp !== false);
  const [enableInstagram, setEnableInstagram] = useState(restaurant.socialMedia?.enableInstagram !== false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setWhatsapp(restaurant.socialMedia?.whatsapp || '');
    setWhatsappMessage(restaurant.socialMedia?.whatsappMessage || '');
    setInstagram(restaurant.socialMedia?.instagram || '');
    setEnableWhatsapp(restaurant.socialMedia?.enableWhatsapp !== false);
    setEnableInstagram(restaurant.socialMedia?.enableInstagram !== false);
  }, [restaurant]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate({
        socialMedia: {
          ...restaurant.socialMedia,
          whatsapp: whatsapp.trim(),
          whatsappMessage: whatsappMessage.trim(),
          instagram: instagram.trim(),
          enableWhatsapp,
          enableInstagram,
        },
      });
      toast.success('Social links updated successfully!');
    } catch (error) {
      toast.error('Failed to update social links');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const analytics = restaurant.socialAnalytics || {
    whatsappClicks: 0,
    instagramClicks: 0,
    facebookClicks: 0,
    twitterClicks: 0,
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Social Media Links</h2>
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Analytics Section */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">WhatsApp Clicks</p>
              <p className="text-3xl font-bold text-green-700">{analytics.whatsappClicks}</p>
            </div>
            <MessageCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Instagram Clicks</p>
              <p className="text-3xl font-bold text-purple-700">{analytics.instagramClicks}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* WhatsApp Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
          </div>
          
          {/* Toggle Switch */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              {enableWhatsapp ? 'Enabled' : 'Disabled'}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={enableWhatsapp}
                onChange={(e) => setEnableWhatsapp(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>
        </div>

        <div className={`space-y-4 ${!enableWhatsapp ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Number (with country code)
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+1234567890"
              className="input-field"
            />
            <p className="mt-1 text-sm text-gray-500">
              Example: +1234567890 or +91 98765 43210
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Message (Optional)
            </label>
            <textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder={`Hi! I'm interested in your menu at ${restaurant.name}`}
              rows={3}
              className="input-field"
            />
            <p className="mt-1 text-sm text-gray-500">
              This message will be pre-filled when customers click the WhatsApp button
            </p>
          </div>

          {whatsapp && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Preview Link:</p>
              <p className="text-sm text-blue-600 break-all">
                https://wa.me/{whatsapp.replace(/\D/g, '')}
                {whatsappMessage && `?text=${encodeURIComponent(whatsappMessage)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instagram Section */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
          </div>
          
          {/* Toggle Switch */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              {enableInstagram ? 'Enabled' : 'Disabled'}
            </span>
            <div className="relative">
              <input
                type="checkbox"
                checked={enableInstagram}
                onChange={(e) => setEnableInstagram(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
            </div>
          </label>
        </div>

        <div className={`space-y-4 ${!enableInstagram ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram Username or URL
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourrestaurant or https://instagram.com/yourrestaurant"
              className="input-field"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter just the username (e.g., @yourrestaurant) or the full URL
            </p>
          </div>

          {instagram && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Preview Link:</p>
              <p className="text-sm text-blue-600 break-all">
                {instagram.startsWith('http') 
                  ? instagram 
                  : `https://instagram.com/${instagram.replace('@', '')}`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> These buttons will appear as floating buttons on your restaurant's menu page. 
          Customers can click them to contact you directly via WhatsApp or follow you on Instagram.
        </p>
      </div>
    </div>
  );
}
