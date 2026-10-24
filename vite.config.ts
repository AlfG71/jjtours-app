import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'JJ Tours Puerto Rico',
        short_name: 'JJ Tours',
        description: 'Reserva tours en Puerto Rico — Book tours in Puerto Rico',
        lang: 'es',
        theme_color: '#0b5d6b',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // Placeholder icon until the logo is picked — replace with 192/512 PNGs.
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Never cache Supabase API / Stripe responses — availability must be live.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
})
