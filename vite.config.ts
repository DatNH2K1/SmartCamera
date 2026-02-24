import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Ensures relative paths for assets so it works on any subdirectory (GitHub Pages)
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
