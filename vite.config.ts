import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import adonisjs from '@adonisjs/vite/client'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    adonisjs({ entryPoints: ['inertia/app.tsx'], reload: ['resources/views/**/*.edge'] }),
    /**
     * Only the service worker comes from the plugin: the manifest is a static
     * file in public/, and the worker is written to public/sw.js so its scope
     * is the whole app (Vite's own output lives under /assets/). Pages are
     * server-rendered by Inertia, so they are network-first; hashed assets
     * are precached.
     */
    VitePWA({
      injectRegister: false,
      manifest: false,
      outDir: 'public',
      filename: 'sw.js',
      workbox: {
        globDirectory: 'public/assets',
        globPatterns: ['**/*.{js,css,woff2,svg,png}'],
        modifyURLPrefix: { '': '/assets/' },
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'forma-pages', networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/icons/') || url.pathname === '/favicon.svg',
            handler: 'CacheFirst',
            options: { cacheName: 'forma-static' },
          },
        ],
      },
    }),
  ],

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${import.meta.dirname}/inertia/`,
      '@generated': `${import.meta.dirname}/.adonisjs/client/`,
      // pure, dependency-free domain code (units, volume…) shared with the server
      '@domain': `${import.meta.dirname}/app/domain/`,
    },
  },

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
