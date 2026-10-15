import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function serveLocalCropsPlugin(): Plugin {
  return {
    name: 'serve-local-crops',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?')[0];
        if (!rawUrl) return next();

        if (
          rawUrl.startsWith('/crops_math/') ||
          rawUrl.startsWith('/crops_physics/') ||
          rawUrl.startsWith('/crops/') ||
          rawUrl.startsWith('/extracted/')
        ) {
          const relativePath = rawUrl.replace(/^\//, '');
          // Check root directory (e.g. ../crops_math/...)
          let targetPath = path.resolve(__dirname, '..', relativePath);
          if (!fs.existsSync(targetPath)) {
            // Check frontend/public folder (./public/...)
            targetPath = path.resolve(__dirname, 'public', relativePath);
          }

          if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache');
            fs.createReadStream(targetPath).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serveLocalCropsPlugin()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    fs: {
      allow: ['.', '../crops_physics', '../crops_math']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-katex': ['katex']
        }
      }
    }
  }
});
