import { normalizedDevProxyOrigin } from './src/lib/proxyOrigin';
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
        // Vite's proxy types do not expose cookiePathRewrite; adjust Set-Cookie
        // through the supported configure hook instead.
        configure: (proxy) => {
          // Forwarded Codespaces HTTPS origins are not the configured local API
          // origin. Allow *only* requests whose Origin matches their incoming
          // Host, then normalize the Origin for the local server's CSRF guard.
          // Cross-site requests preserve their Origin and remain rejected.
          proxy.on('proxyReq', (proxyReq, req) => {
            if (process.env.NODE_ENV === 'production') return;
            const localOrigin = normalizedDevProxyOrigin(
              req.headers.origin,
              req.headers.host,
            );
            if (localOrigin) proxyReq.setHeader('Origin', localOrigin);
          });
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (!cookies) return;
            proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
              cookie.replace(/(\bPath=)\/auth(?=;|$)/i, '$1/__api/auth'),
            );
          });
        },
        rewrite: (path) => path.replace(/^\/__api/, ''),
      },
    },
  },
});
