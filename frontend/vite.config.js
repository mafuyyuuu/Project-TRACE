import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/__tests__/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'TRACE Clerk Dashboard',
        short_name: 'TRACE',
        description: 'Project TRACE Registrar System',
        theme_color: '#111827',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    // 5173 (Vite's default) and 3000 are left free for other projects.
    port: 5273,
    strictPort: true,
    proxy: {
      // Uploaded files are served through /api/files (authenticated), so the
      // old unauthenticated /uploads mount no longer needs a proxy entry.
      '/api': {
        target: 'http://localhost:3300',
        changeOrigin: true,
      }
    }
  }
})
