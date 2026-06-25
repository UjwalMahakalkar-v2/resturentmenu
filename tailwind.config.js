/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Static admin/utility palette — never changes
        primary: {
          50: '#faf8f5',
          100: '#f5f1ea',
          200: '#e8dfd0',
          300: '#d9c9b0',
          400: '#c5ab87',
          500: '#b08d5f',
          600: '#9a7548',
          700: '#7d5e3a',
          800: '#664d31',
          900: '#54402a',
        },
        cream: '#faf8f5',
        dark: '#1a1a1a',
        // Tenant-themeable colors — driven by CSS variables
        'theme-primary': 'var(--color-primary)',
        'theme-primary-hover': 'var(--color-primary-hover)',
        'theme-primary-light': 'var(--color-primary-light)',
        'theme-secondary': 'var(--color-secondary)',
        'theme-accent': 'var(--color-accent)',
        'theme-bg': 'var(--color-bg)',
        'theme-text': 'var(--color-text)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      minHeight: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
