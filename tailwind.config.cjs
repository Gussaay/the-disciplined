/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep pine green: steady, calm, serious. The gold is for what was earned.
        brand: {
          50: '#EEF6F4',
          100: '#D5E9E5',
          200: '#A9D2CB',
          300: '#78B5AC',
          400: '#4A958B',
          500: '#2B786F',
          600: '#1D6059',
          700: '#164D48',
          800: '#0F3D3E',
          900: '#0A2B2C',
        },
        gold: { 100: '#FBF0D0', 300: '#EBCB73', 400: '#E0B84A', 500: '#C99A22', 600: '#A67C12' },
        paper: '#F6F3EC',
        ink: '#0C1716',
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        quran: ['"Amiri Quran"', '"Scheherazade New"', '"Traditional Arabic"', 'Tajawal', 'serif'],
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        sheet: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
      },
      animation: {
        rise: 'rise 0.25s ease-out both',
        sheet: 'sheet 0.22s ease-out both',
      },
    },
  },
  plugins: [],
};
