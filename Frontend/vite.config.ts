import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Correction de __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', //  Accessible depuis téléphone (même Wi-Fi)
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
   //server: {
   // host: '0.0.0.0',          //  Permet l'accès depuis d'autres appareils (téléphone)
   //  port: 3000,                // Tu peux le changer si besoin
  //  proxy: {
     // '/api': 'http://192.168.0.7:5000',  //  Redirige les appels API vers backend
    //},
  //},