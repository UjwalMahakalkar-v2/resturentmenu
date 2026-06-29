import { useState, useEffect } from 'react';
import { Megaphone, Save, Sparkles } from 'lucide-react';
import { restaurantSettingsAPI } from '@/services/api';
import type { AnnouncementBar as AnnouncementConfig, AnnouncementType, AnnouncementSpeed } from '@/types';
import AnnouncementBar from './AnnouncementBar';
import toast from 'react-hot-toast';

const MAX_LEN = 150;

const TYPE_BG: Record<AnnouncementType, string> = {
  offer:       '#DC2626',
  information: '#2563EB',
  warning:     '#EA580C',
  event:       '#7C3AED',
};

const TYPES: { id: AnnouncementType; label: string; hint: string }[] = [
  { id: 'offer',       label: 'Offer',       hint: 'Red' },
  { id: 'information', label: 'Information', hint: 'Blue' },
  { id: 'warning',     label: 'Warning',    hint: 'Orange' },
  { id: 'event',       label: 'Event',      hint: 'Purple' },
];

const SPEEDS: AnnouncementSpeed[] = ['slow', 'medium', 'fast'];

// Click-to-fill presets (text stays editable after selecting)
const PRESETS = [
  '🎉 Buy 2 Burgers, Get 1 Free.',
  '🍕 Weekend Special: 15% OFF on all orders.',
  '🎁 Free Dessert on orders above ₹799.',
  '🚚 Free Delivery above ₹499.',
  '🥤 Free Soft Drink with every Combo Meal.',
  '🕓 Happy Hours: 4 PM – 6 PM. Get 20% OFF.',
  '🎉 Welcome to our restaurant!',
  '😊 Thank you for visiting us.',
  '📞 Call us for reservations.',
  '🚚 Home delivery available.',
  '🪑 Table reservations are now open.',
  '🎂 Birthday party bookings available.',
  '📍 We are now open until midnight.',
  'Buy 2 Get 1 Free',
  'Table Reservations Open',
  'New Dishes Added',
  'Chef Special Today',
];

const DEFAULT: Required<AnnouncementConfig> = {
  enabled: false,
  text: '',
  type: 'offer',
  backgroundColor: TYPE_BG.offer,
  textColor: '#FFFFFF',
  speed: 'medium',
  link: '',
  buttonText: '',
  startDate: '',
  endDate: '',
};

export default function AnnouncementSettings() {
  const [a, setA] = useState<Required<AnnouncementConfig>>(DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await restaurantSettingsAPI.get();
        if (data?.announcement) setA({ ...DEFAULT, ...data.announcement });
      } catch {
        // No saved announcement yet — keep defaults
      }
    };
    load();
  }, []);

  const set = <K extends keyof AnnouncementConfig>(key: K, value: AnnouncementConfig[K]) =>
    setA(prev => ({ ...prev, [key]: value }));

  // Picking a type swaps in that type's signature color (still customizable afterwards)
  const handleType = (type: AnnouncementType) =>
    setA(prev => ({ ...prev, type, backgroundColor: TYPE_BG[type] }));

  const handleSave = async () => {
    if (a.enabled && !a.text.trim()) {
      toast.error('Announcement text cannot be empty when enabled');
      return;
    }
    setSaving(true);
    try {
      await restaurantSettingsAPI.save({ announcement: a } as any);
      toast.success('Announcement saved successfully');
      window.dispatchEvent(new Event('restaurant-updated'));
    } catch {
      toast.error('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header + enable toggle */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-5 h-5 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Announcement Bar</h2>
          </div>
          <p className="text-gray-600">Show a scrolling banner with offers or notices at the top of your menu page.</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 mt-1">
          <span className={`text-sm font-medium ${a.enabled ? 'text-green-600' : 'text-gray-400'}`}>
            {a.enabled ? 'On' : 'Off'}
          </span>
          <div className="relative">
            <input type="checkbox" checked={a.enabled} onChange={e => set('enabled', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
          </div>
        </label>
      </div>

      {/* Live Preview */}
      <div className="mb-6 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-3">Live Preview</p>
        <div className="p-4">
          <div className="rounded-lg overflow-hidden shadow-sm">
            <AnnouncementBar announcement={{ ...a, enabled: true, text: a.text.trim() || 'Your announcement text will appear here…', startDate: '', endDate: '' }} />
          </div>
        </div>
      </div>

      {/* Quick presets */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Messages</h3>
          <span className="text-xs text-gray-400">(click to use — still editable)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => set('text', p.slice(0, MAX_LEN))}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-primary-50 hover:border-primary-300 text-gray-700 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Text */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-gray-700">Announcement Text</label>
          <span className={`text-xs ${a.text.length >= MAX_LEN ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            {a.text.length}/{MAX_LEN}
          </span>
        </div>
        <input
          type="text"
          value={a.text}
          maxLength={MAX_LEN}
          onChange={e => set('text', e.target.value)}
          placeholder="🔥 Flat 20% OFF on all pizzas today!"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Type */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Announcement Type</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleType(t.id)}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                a.type === t.id ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full shrink-0 border border-white shadow-inner" style={{ background: TYPE_BG[t.id] }} />
              <span className="text-sm font-medium text-gray-800">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Colors + Speed */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
          <input type="color" value={a.backgroundColor} onChange={e => set('backgroundColor', e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border-0 p-0.5 bg-transparent" title="Background color" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">Background</p>
            <code className="text-xs text-gray-500 font-mono">{a.backgroundColor}</code>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
          <input type="color" value={a.textColor} onChange={e => set('textColor', e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border-0 p-0.5 bg-transparent" title="Text color" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">Text</p>
            <code className="text-xs text-gray-500 font-mono">{a.textColor}</code>
          </div>
        </div>
        <div className="p-3 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-800 mb-2">Speed</p>
          <div className="flex gap-1.5">
            {SPEEDS.map(s => (
              <button key={s} type="button" onClick={() => set('speed', s)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md border capitalize transition-colors ${
                  a.speed === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-500'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Link + Button text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Link <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="url" value={a.link} onChange={e => set('link', e.target.value)} placeholder="https://…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Button Text <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={a.buttonText} maxLength={24} onChange={e => set('buttonText', e.target.value)} placeholder="Order Now"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="date" value={a.startDate} onChange={e => set('startDate', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">End Date <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="date" value={a.endDate} min={a.startDate || undefined} onChange={e => set('endDate', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Announcement'}
        </button>
      </div>
    </div>
  );
}
