import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = 'http://127.0.0.1:4000';
const apiProxy = { target: apiTarget, changeOrigin: true };

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/health': { ...apiProxy },
      '/metrics': { ...apiProxy },
      '/auth': { ...apiProxy },
      '/groups': { ...apiProxy },
      '/students': { ...apiProxy },
      '/lesson-sessions': { ...apiProxy },
      '/uploads': { ...apiProxy },
      '/notifications': { ...apiProxy },
      '/subscriptions': { ...apiProxy },
      '/categories': { ...apiProxy },
      '/handouts': { ...apiProxy },
      '/admin': { ...apiProxy },
      '/blog': { ...apiProxy },
      '/cms': { ...apiProxy },
      '/attempts': { ...apiProxy },
      '/exams': { ...apiProxy },
      '/banks': { ...apiProxy },
      '/practice': { ...apiProxy },
      '/socket.io': { ...apiProxy, ws: true },
    },
  },
});
