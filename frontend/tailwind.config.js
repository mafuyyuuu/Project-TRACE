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
          '0%': { transform: 'translateY(1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      }
    },
  },
  plugins: [],
}
