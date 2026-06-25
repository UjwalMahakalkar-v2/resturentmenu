/**
 * ThemeContext — per-tenant color theming system.
 *
 * Usage:
 *   import { applyTheme, resetTheme, PRESET_THEMES } from '@/contexts/ThemeContext';
 *
 *   applyTheme(PRESET_THEMES['ocean-blue']);   // instant switch, no reload
 *   applyTheme({ primary: '#DC2626' });        // partial override
 *   resetTheme();                              // back to default brown
 */
import { createContext, useContext, useCallback } from 'react';
import type { RestaurantTheme } from '@/types';

// ── Preset themes ─────────────────────────────────────────────────────────────
export const PRESET_THEMES: Record<string, Required<RestaurantTheme>> = {
  'classic-brown': {
    name: 'Classic Brown',
    primary: '#9a7548',
    primaryHover: '#7d5e3a',
    primaryLight: '#f5f1ea',
    secondary: '#b08d5f',
    accent: '#c5ab87',
    background: '#faf8f5',
    text: '#1a1a1a',
    buttonStyle: 'rounded',
  },
  'classic-red': {
    name: 'Classic Red',
    primary: '#DC2626',
    primaryHover: '#b91c1c',
    primaryLight: '#fee2e2',
    secondary: '#f87171',
    accent: '#fca5a5',
    background: '#ffffff',
    text: '#111827',
    buttonStyle: 'rounded',
  },
  'ocean-blue': {
    name: 'Ocean Blue',
    primary: '#2563EB',
    primaryHover: '#1d4ed8',
    primaryLight: '#dbeafe',
    secondary: '#60A5FA',
    accent: '#FBBF24',
    background: '#ffffff',
    text: '#111827',
    buttonStyle: 'rounded',
  },
  'forest-green': {
    name: 'Forest Green',
    primary: '#16A34A',
    primaryHover: '#15803d',
    primaryLight: '#dcfce7',
    secondary: '#4ade80',
    accent: '#86efac',
    background: '#ffffff',
    text: '#111827',
    buttonStyle: 'rounded',
  },
  'coffee-brown': {
    name: 'Coffee Brown',
    primary: '#92400E',
    primaryHover: '#78350f',
    primaryLight: '#fef3c7',
    secondary: '#d97706',
    accent: '#fbbf24',
    background: '#fffbeb',
    text: '#1c1917',
    buttonStyle: 'rounded',
  },
  'royal-purple': {
    name: 'Royal Purple',
    primary: '#7C3AED',
    primaryHover: '#6d28d9',
    primaryLight: '#ede9fe',
    secondary: '#a78bfa',
    accent: '#c4b5fd',
    background: '#ffffff',
    text: '#111827',
    buttonStyle: 'pill',
  },
  'sunset-orange': {
    name: 'Sunset Orange',
    primary: '#EA580C',
    primaryHover: '#c2410c',
    primaryLight: '#ffedd5',
    secondary: '#fb923c',
    accent: '#fdba74',
    background: '#ffffff',
    text: '#111827',
    buttonStyle: 'rounded',
  },
  'dark': {
    name: 'Dark Mode',
    primary: '#7C3AED',
    primaryHover: '#6d28d9',
    primaryLight: '#1e1b4b',
    secondary: '#8b5cf6',
    accent: '#a78bfa',
    background: '#111827',
    text: '#F9FAFB',
    buttonStyle: 'rounded',
  },
};

export const DEFAULT_THEME = PRESET_THEMES['classic-brown'];

// ── Core applyTheme function ──────────────────────────────────────────────────
export function applyTheme(theme: Partial<RestaurantTheme>) {
  const root = document.documentElement;
  if (theme.primary)       root.style.setProperty('--color-primary', theme.primary);
  if (theme.primaryHover)  root.style.setProperty('--color-primary-hover', theme.primaryHover);
  if (theme.primaryLight)  root.style.setProperty('--color-primary-light', theme.primaryLight);
  if (theme.secondary)     root.style.setProperty('--color-secondary', theme.secondary);
  if (theme.accent)        root.style.setProperty('--color-accent', theme.accent);
  if (theme.background)    root.style.setProperty('--color-bg', theme.background);
  if (theme.text)          root.style.setProperty('--color-text', theme.text);

  const radiusMap = { pill: '9999px', square: '0', rounded: '0.5rem' };
  const radius = radiusMap[theme.buttonStyle ?? 'rounded'];
  root.style.setProperty('--btn-radius', radius);
}

export function resetTheme() {
  applyTheme(DEFAULT_THEME);
}

// ── Context (for components that need live-preview integration) ───────────────
interface ThemeContextValue {
  applyTheme: (theme: Partial<RestaurantTheme>) => void;
  resetTheme: () => void;
  presets: typeof PRESET_THEMES;
}

const ThemeContext = createContext<ThemeContextValue>({
  applyTheme,
  resetTheme,
  presets: PRESET_THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const apply = useCallback((theme: Partial<RestaurantTheme>) => applyTheme(theme), []);
  const reset = useCallback(() => resetTheme(), []);
  return (
    <ThemeContext.Provider value={{ applyTheme: apply, resetTheme: reset, presets: PRESET_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
