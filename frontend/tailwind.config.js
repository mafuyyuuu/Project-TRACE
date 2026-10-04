/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'camp-blue': {
          50: '#e8f6fd',
          100: '#c5e8fa',
          300: '#7ec7ea',
          500: '#1ca7ec',
          600: '#178dc8',
          700: '#126fa0',
          900: '#07344d',
        },
        'campfire': {
          50: '#fff7e6',
          200: '#fde68a',
          500: '#e18f00',
          600: '#c97c00',
          700: '#8a5600',
        },
        'pine': {
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
        },
        'ember': {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        'dusk': {
          500: '#7c3aed',
        },
        'berry': {
          500: '#ec4899',
        },
        'meadow': {
          500: '#2f5233',
        }
      },
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(var(--trace-motion-drill-distance))', opacity: 'var(--trace-motion-opacity)' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: 'var(--trace-motion-opacity)' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up var(--trace-motion-drill-duration) var(--trace-motion-easing)',
        'fade-in': 'fade-in var(--trace-motion-context-duration) var(--trace-motion-easing)',
      }
    },
  },
  plugins: [],
}
