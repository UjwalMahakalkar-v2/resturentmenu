import { useState, useEffect } from 'react';
import { Save, MessageCircle, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { restaurantService } from '@/services/restaurantService';
import type { Restaurant } from '@/types';

export default function SocialLinksSettings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [instagram, setInstagram] = useState('');
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);
  const [enableInstagram, setEnableInstagram] = useState(true);
  const [enableClickTracking, setEnableClickTracking] = useState(true);
  const [clickRetentionDays, setClickRetentionDays] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    restaurantService.get().then((r) => {
      setRestaurant(r);
      setWhatsapp(r.socialMedia?.whatsapp || '');
      setWhatsappMessage(r.socialMedia?.whatsappMessage || '');
      setInstagram(r.socialMedia?.instagram || '');
      setEnableWhatsapp(r.socialMedia?.enableWhatsapp !== false);
      setEnableInstagram(r.socialMedia?.enableInstagram !== false);
      setEnableClickTracking(r.enableClickTracking !== false);
      setClickRetentionDays(r.clickRetentionDays ?? 30);
    });
  }, []);

  const handleSave = async () => {
    if (!restaurant) return;
    setSaving(true);
    try {
      await restaurantService.save({
        ...restaurant,
        socialMedia: {
          ...restaurant.socialMedia,
          whatsapp: whatsapp.trim(),
          whatsappMessage: whatsappMessage.trim(),
          instagram: instagram.trim(),
          enableWhatsapp,
          enableInstagram,
        },
        enableClickTracking,
        clickRetentionDays,
      });
      window.dispatchEvent(new Event('restaurant-updated'));
      toast.success('Social settings saved!');
    } catch {
      toast.error('Failed to save social settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Social Media Links</h2>
          <p className="text-gray-600 mt-1">Configure WhatsApp and Instagram buttons on your menu page</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !restaurant}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* WhatsApp Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">WhatsApp</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              {enableWhatsapp ? 'Enabled' : 'Disabled'}
            </span>
            <div className="relative">
              <input type="checkbox" checked={enableWhatsapp} onChange={(e) => setEnableWhatsapp(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </div>
          </label>
        </div>

        <div className={`space-y-4 ${!enableWhatsapp ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number (with country code)</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+91 98765 43210"
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-500">Include country code, e.g. +91 for India</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pre-filled Message (Optional)</label>
            <textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder={`Hi! I'd like to place an order from ${restaurant?.name || 'your restaurant'}`}
              rows={3}
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-500">This message is pre-filled when customers tap the WhatsApp button</p>
          </div>

          {whatsapp && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-1">Preview link:</p>
              <p className="text-xs text-blue-600 break-all">
                https://wa.me/{whatsapp.replace(/\D/g, '')}
                {whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instagram Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              {enableInstagram ? 'Enabled' : 'Disabled'}
            </span>
            <div className="relative">
              <input type="checkbox" checked={enableInstagram} onChange={(e) => setEnableInstagram(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
            </div>
          </label>
        </div>

        <div className={`space-y-4 ${!enableInstagram ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Username or URL</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourrestaurant or https://instagram.com/yourrestaurant"
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-500">Enter username (e.g. @yourrestaurant) or the full URL</p>
          </div>

          {instagram && (
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-1">Preview link:</p>
              <p className="text-xs text-blue-600 break-all">
                {instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Click Tracking Section */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Click Tracking</h3>
              <p className="text-xs text-gray-500">Count how many customers tap your social buttons</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">
              {enableClickTracking ? 'Recording' : 'Paused'}
            </span>
            <div className="relative">
              <input type="checkbox" checked={enableClickTracking} onChange={(e) => setEnableClickTracking(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </div>
          </label>
        </div>

        <div className={`${!enableClickTracking ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Retention Period (days)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={365}
              value={clickRetentionDays}
              onChange={(e) => setClickRetentionDays(Math.max(1, Math.min(365, Number(e.target.value))))}
              className="input-field w-28"
            />
            <span className="text-sm text-gray-500">days of click history to display in Analytics</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Set how long click data is shown in the Analytics tab (1–365 days)</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Social buttons appear as floating icons on your public menu page. View full click stats in the <strong>Analytics</strong> tab.
        </p>
      </div>
    </div>
  );
}
