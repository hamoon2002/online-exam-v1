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
        // Browser sees /__api/auth/*, while the backend sets refreshToken Path=/auth.
        // Rewrite the cookie path so it is included on refresh after page reload.
        cookiePathRewrite: { '/auth': '/__api/auth' },
        rewrite: (path) => path.replace(/^\/__api/, ''),
      },
    },
  },
});
