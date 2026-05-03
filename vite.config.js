import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/hotdesk/',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hotdesk',
        short_name: 'Hotdesk',
        description: 'A persistent, distraction-free notepad for your new tab.',
        scope: '/hotdesk/',
        start_url: '/hotdesk/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#c0c0c0',
        icons: [
          {
            src: '/hotdesk/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/hotdesk/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/hotdesk/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      }
    })
  ]
});
