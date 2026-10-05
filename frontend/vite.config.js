import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { TRACE_BRANDING } from './src/utils/branding.js'

// Browser/PWA icons embed the same exact export as the header. SVG supplies a
// tight viewport around its transparent canvas; no substitute logo is drawn.
function traceBranding() {
  const icons = [[TRACE_BRANDING.favicon, TRACE_BRANDING.light], [TRACE_BRANDING.faviconDark, TRACE_BRANDING.dark]]
  const favicon = source => {
    const png = readFileSync(new URL(`./public${source}`, import.meta.url)).toString('base64')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${TRACE_BRANDING.viewBox}"><title>TRACE</title><image width="${TRACE_BRANDING.width}" height="${TRACE_BRANDING.height}" href="data:image/png;base64,${png}"/></svg>`
  }
  return {
    name: 'trace-branding',
    transformIndexHtml: html => html.replace('__TRACE_FAVICON__', TRACE_BRANDING.favicon),
    configureServer(server) {
      for (const [path, source] of icons) {
        server.middlewares.use(path, (_req, res) => {
          res.setHeader('Content-Type', 'image/svg+xml')
          res.end(favicon(source))
        })
      }
    },
    generateBundle() {
      for (const [path, source] of icons) {
        this.emitFile({ type: 'asset', fileName: path.slice(1), source: favicon(source) })
      }
    },
  }
}

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
    traceBranding(),
    VitePWA({
      registerType: 'autoUpdate',
      useCredentials: true,
      workbox: { globPatterns: ['**/*.{js,css,html,svg}'] },
      includeAssets: [TRACE_BRANDING.light.slice(1), TRACE_BRANDING.dark.slice(1)],
      manifest: {
        name: 'TRACE Clerk Dashboard',
        short_name: 'TRACE',
        description: 'Project TRACE Registrar System',
        theme_color: '#111827',
        icons: [
          {
            src: TRACE_BRANDING.favicon.slice(1),
            sizes: 'any',
            type: 'image/svg+xml'
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
      },
      // Socket.IO needs the websocket upgrade forwarded, not just HTTP.
      '/socket.io': {
        target: 'http://localhost:3300',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
