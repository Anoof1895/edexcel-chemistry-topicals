import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function serveLocalCropsPlugin(): Plugin {
  const allowedRoots = [
    path.resolve(__dirname, '..', 'output'),
    path.resolve(__dirname, '..', 'crops_math'),
    path.resolve(__dirname, '..', 'crops_physics'),
    path.resolve(__dirname, '..', 'crops'),
    path.resolve(__dirname, '..', 'extracted'),
    path.resolve(__dirname, 'public'),
  ];

  return {
    name: 'serve-local-crops',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?')[0];
        if (!rawUrl) return next();

        let decodedUrl: string;
        try {
          decodedUrl = decodeURIComponent(rawUrl);
        } catch {
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }

        if (rawUrl.includes('..') || decodedUrl.includes('..')) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        if (
          decodedUrl.startsWith('/output/') ||
          decodedUrl.startsWith('/crops_math/') ||
          decodedUrl.startsWith('/crops_physics/') ||
          decodedUrl.startsWith('/crops/') ||
          decodedUrl.startsWith('/extracted/')
        ) {
          const relativePath = decodedUrl.replace(/^\/+/, '');
          const candidatePaths = [
            path.resolve(__dirname, '..', relativePath),
            path.resolve(__dirname, 'public', relativePath),
          ];

          for (const targetPath of candidatePaths) {
            const isAllowed = allowedRoots.some((allowedRoot) =>
              targetPath.startsWith(allowedRoot + path.sep)
            );
            if (!isAllowed) continue;

            if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
              res.setHeader('Content-Type', 'image/png');
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(targetPath).pipe(res);
              return;
            }
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
    fs: {
      allow: ['.', '../crops_physics', '../crops_math', '../output']
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
