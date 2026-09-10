import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Outside Docker the API is on localhost; inside the dev container it is the
// `api` service. One env var so the same config works in both.
const API_PROXY = process.env.VITE_API_PROXY ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 so the port is reachable from outside the container
    // Docker on macOS/Windows cannot deliver inotify events to the container,
    // so the watcher has to poll or edits on the host go unnoticed.
    watch: { usePolling: true, interval: 300 },
    proxy: {
      '/api': { target: API_PROXY, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
});
