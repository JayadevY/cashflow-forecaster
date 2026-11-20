/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High contrast brand and alert colors for accessibility
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        safe: {
          bg: '#ecfdf5',
          border: '#a7f3d0',
          text: '#065f46',
          badge: '#10b981',
        },
        watch: {
          bg: '#fffbeb',
          border: '#fde68a',
          text: '#92400e',
          badge: '#f59e0b',
        },
        danger: {
          bg: '#fef2f2',
          border: '#fecaca',
          text: '#991b1b',
          badge: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
