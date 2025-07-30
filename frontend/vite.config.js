import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: '../extension/dist', // emit bundle straight into extension folder
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // Stable names so popup.html stays constant
        entryFileNames: 'popup.js',
        assetFileNames: 'popup.css',
        chunkFileNames: '[name].js',
      },
      input: {
        popup: 'src/extensionPopup.jsx',
      },
    },
  },
}); 