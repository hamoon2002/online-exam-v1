import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = 'http://127.0.0.1:4000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/__api': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/__api/, ''),
      },
    },
  },
});
