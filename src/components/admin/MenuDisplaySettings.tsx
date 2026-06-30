import { useState, useEffect } from 'react';
import { Eye, Save } from 'lucide-react';
import { restaurantSettingsAPI } from '@/services/api';
import toast from 'react-hot-toast';

/**
 * Menu display settings (customer-facing storefront behaviour):
 * - Out-of-stock behaviour: show an "Out of Stock" badge, or hide the item.
 * - Share Menu button toggle (used by feature 2).
 */
export default function MenuDisplaySettings() {
  const [outOfStockBehavior, setBehavior] = useState<'badge' | 'hide'>('badge');
  const [enableShareMenu, setShare] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    restaurantSettingsAPI.get().then((d: any) => {
      if (d?.outOfStockBehavior) setBehavior(d.outOfStockBehavior);
      if (typeof d?.enableShareMenu === 'boolean') setShare(d.enableShareMenu);
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await restaurantSettingsAPI.save({ outOfStockBehavior, enableShareMenu } as any);
      toast.success('Menu display settings saved');
      window.dispatchEvent(new Event('restaurant-updated'));
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-1">
        <Eye className="w-5 h-5 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-900">Menu Display</h2>
      </div>
      <p className="text-gray-600 mb-6">How the customer menu behaves for out-of-stock items and sharing.</p>

      {/* Out-of-stock behaviour */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">When an item is unavailable / out of stock</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {([
            { v: 'badge', title: 'Show “Out of Stock” badge', desc: 'Item stays on the menu, marked as unavailable.' },
            { v: 'hide', title: 'Hide the item', desc: 'Item is removed from the customer menu entirely.' },
          ] as const).map(o => (
            <button
              key={o.v}
              type="button"
              onClick={() => setBehavior(o.v)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${outOfStockBehavior === o.v ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-400'}`}
            >
              <p className="text-sm font-semibold text-gray-900">{o.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{o.desc}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Mark individual dishes available/unavailable from the “Available” toggle on each menu item.</p>
      </div>

      {/* Share menu toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl mb-6">
        <div>
          <p className="text-sm font-semibold text-gray-900">Show “Share Menu” button</p>
          <p className="text-xs text-gray-500">Lets customers share your menu link (works on all templates).</p>
        </div>
        <button
          type="button"
          onClick={() => setShare(s => !s)}
          className={`relative w-12 h-6 rounded-full transition-colors ${enableShareMenu ? 'bg-primary-600' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enableShareMenu ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Display Settings'}
        </button>
      </div>
    </div>
  );
}
