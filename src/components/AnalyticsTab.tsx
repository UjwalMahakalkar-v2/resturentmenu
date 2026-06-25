import { useEffect, useState } from 'react';
import api from '@/services/api';
import { MessageCircle, Package, Star, XCircle, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';

interface Analytics {
  socialClicks: { whatsapp: number; instagram: number; facebook: number; twitter: number };
  menuStats: { totalItems: number; availableItems: number; popularItems: number; vegItems: number; nonVegItems: number };
}

export default function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-500">Loading analytics...</div>;
  if (!analytics) return null;

  const totalSocialClicks =
    analytics.socialClicks.whatsapp +
    analytics.socialClicks.instagram +
    analytics.socialClicks.facebook +
    analytics.socialClicks.twitter;

  const socialPlatforms = [
    { label: 'WhatsApp', key: 'whatsapp', count: analytics.socialClicks.whatsapp, icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-50', bar: 'bg-green-500' },
    { label: 'Instagram', key: 'instagram', count: analytics.socialClicks.instagram, icon: Package, color: 'text-pink-500', bg: 'bg-pink-50', bar: 'bg-pink-500' },
    { label: 'Facebook', key: 'facebook', count: analytics.socialClicks.facebook, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-600' },
    { label: 'Twitter', key: 'twitter', count: analytics.socialClicks.twitter, icon: Package, color: 'text-sky-500', bg: 'bg-sky-50', bar: 'bg-sky-500' },
  ];

  const menuStatCards = [
    { label: 'Total Items', value: analytics.menuStats.totalItems, icon: Package, color: 'text-gray-700', bg: 'bg-gray-100' },
    { label: 'Available', value: analytics.menuStats.availableItems, icon: Package, color: 'text-green-700', bg: 'bg-green-100' },
    { label: 'Unavailable', value: analytics.menuStats.totalItems - analytics.menuStats.availableItems, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Popular', value: analytics.menuStats.popularItems, icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Veg', value: analytics.menuStats.vegItems, icon: Leaf, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Non-Veg', value: analytics.menuStats.nonVegItems, icon: Package, color: 'text-red-700', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Menu Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {menuStatCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-lg p-4 text-center`}>
              <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Social Clicks */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Social Media Clicks</h3>
        <p className="text-sm text-gray-500 mb-4">Total clicks: <span className="font-semibold text-gray-800">{totalSocialClicks}</span></p>
        <div className="space-y-4">
          {socialPlatforms.map(({ label, count, icon: Icon, color, bg, bar }) => {
            const pct = totalSocialClicks > 0 ? Math.round((count / totalSocialClicks) * 100) : 0;
            return (
              <div key={label} className={`${bg} rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="font-medium text-gray-800">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{count} clicks ({pct}%)</span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className={`${bar} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {totalSocialClicks === 0 && (
          <p className="text-sm text-gray-500 mt-4 text-center">No social clicks tracked yet. Clicks are recorded when customers tap your WhatsApp or Instagram buttons.</p>
        )}
      </div>
    </div>
  );
}
