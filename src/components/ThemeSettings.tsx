import { useState, useEffect } from 'react';
import { Palette, RotateCcw, Save, Check } from 'lucide-react';
import { applyTheme, resetTheme, PRESET_THEMES, DEFAULT_THEME } from '@/contexts/ThemeContext';
import { restaurantSettingsAPI } from '@/services/api';
import type { RestaurantTheme } from '@/types';
import toast from 'react-hot-toast';

const PRESET_LIST = Object.entries(PRESET_THEMES).map(([key, theme]) => ({ key, ...theme }));

const SWATCH_COLORS: Record<string, string> = {
  'classic-brown':  '#9a7548',
  'classic-red':    '#DC2626',
  'ocean-blue':     '#2563EB',
  'forest-green':   '#16A34A',
  'coffee-brown':   '#92400E',
  'royal-purple':   '#7C3AED',
  'sunset-orange':  '#EA580C',
  'dark':           '#111827',
};

export default function ThemeSettings() {
  const [theme, setTheme] = useState<RestaurantTheme>(DEFAULT_THEME);
  const [activePreset, setActivePreset] = useState<string>('classic-brown');
  const [saving, setSaving] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await restaurantSettingsAPI.get();
        if (data?.theme) {
          const t = data.theme;
          setTheme(t);
          applyTheme(t);
          const match = PRESET_LIST.find(p => p.primary === t.primary);
          setActivePreset(match?.key ?? 'custom');
        }
      } catch {
        // No saved theme yet — use default
      }
    };
    load();
  }, []);

  const handlePresetSelect = (key: string) => {
    const preset = PRESET_THEMES[key];
    setActivePreset(key);
    setTheme(preset);
    applyTheme(preset);
  };

  const handleColorChange = (field: keyof RestaurantTheme, value: string) => {
    const updated = { ...theme, [field]: value };
    setTheme(updated);
    setActivePreset('custom');
    applyTheme(updated);
  };

  const handleButtonStyleChange = (style: RestaurantTheme['buttonStyle']) => {
    const updated = { ...theme, buttonStyle: style };
    setTheme(updated);
    applyTheme(updated);
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME);
    setActivePreset('classic-brown');
    resetTheme();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await restaurantSettingsAPI.save({ theme } as any);
      toast.success('Theme saved successfully');
    } catch {
      toast.error('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const btnRadiusPreview: Record<string, string> = {
    rounded: '0.5rem',
    pill: '9999px',
    square: '0',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">Theme & Branding</h2>
        </div>
        <p className="text-gray-600">Choose a preset or customize your restaurant's color identity.</p>
      </div>

      {/* ── Preset Grid ── */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Preset Themes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESET_LIST.map(preset => (
            <button
              key={preset.key}
              onClick={() => handlePresetSelect(preset.key)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                activePreset === preset.key
                  ? 'border-gray-900 shadow-md scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {/* Color swatch */}
              <div
                className="w-10 h-10 rounded-full shadow-inner border border-white"
                style={{ backgroundColor: SWATCH_COLORS[preset.key] ?? preset.primary }}
              />
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">{preset.name}</span>
              {activePreset === preset.key && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom Colors ── */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Custom Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { field: 'primary' as const, label: 'Primary Color', hint: 'Buttons, active tabs, accents' },
            { field: 'primaryHover' as const, label: 'Primary Hover', hint: 'Button hover state' },
            { field: 'background' as const, label: 'Background Color', hint: 'Page background' },
            { field: 'text' as const, label: 'Text Color', hint: 'Main text color' },
          ].map(({ field, label, hint }) => (
            <div key={field} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <div className="relative">
                <input
                  type="color"
                  value={(theme[field] as string) || '#000000'}
                  onChange={e => handleColorChange(field, e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border-0 p-0.5 bg-transparent"
                  title={label}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 truncate">{hint}</p>
              </div>
              <code className="text-xs text-gray-600 font-mono hidden sm:block">
                {(theme[field] as string) || '#—'}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* ── Button Style ── */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Button Style</h3>
        <div className="flex flex-wrap gap-3 items-center">
          {(['rounded', 'pill', 'square'] as const).map(style => (
            <button
              key={style}
              onClick={() => handleButtonStyleChange(style)}
              className={`px-5 py-2 border-2 text-sm font-medium transition-all capitalize ${
                theme.buttonStyle === style
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-500'
              }`}
              style={{ borderRadius: btnRadiusPreview[style] }}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* ── Live Preview ── */}
      <div className="mb-8 p-4 rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Live Preview</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="text-white px-5 py-2 font-medium shadow-sm text-sm"
            style={{
              backgroundColor: theme.primary,
              borderRadius: btnRadiusPreview[theme.buttonStyle ?? 'rounded'],
            }}
          >
            Order Now
          </button>
          <span
            className="text-xl font-bold"
            style={{ color: theme.primary }}
          >
            ₹250
          </span>
          <span
            className="px-3 py-1 text-white text-sm font-medium rounded-full"
            style={{ backgroundColor: theme.primary }}
          >
            Popular
          </span>
          <span
            className="px-3 py-1 text-sm font-medium rounded-full"
            style={{ backgroundColor: theme.primaryLight, color: theme.primary }}
          >
            Appetizers
          </span>
        </div>
        <div
          className="mt-3 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: theme.background ?? '#faf8f5', color: theme.text ?? '#1a1a1a', border: '1px solid #e5e7eb' }}
        >
          Sample menu item name — this is how your page background and text will look.
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Default
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Theme'}
        </button>
      </div>
    </div>
  );
}
