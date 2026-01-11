import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // This is the specific fix for the 401 error
      useCredentials: true, 
      
      // Basic settings to make it work with your existing files
      registerType: 'autoUpdate',
      includeAssets: ['logo1.ico', 'robots.txt'], 
      manifest: {
        name: 'Doc Online',
        short_name: 'DocOnline',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo1.ico', 
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ]
});