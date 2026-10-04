import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    fs: {
      // public/crops_physics is a Windows junction to ../crops_physics; allow its real path
      allow: ['.', '../crops_physics']
    }
  }
});
