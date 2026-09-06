import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The site around this one is hand-written static HTML deployed straight from
// the repo root, so this app builds *out* of its source folder into /v2, which
// is what Firebase serves. `portfolio/**` is ignored by hosting so the source,
// node_modules and config never ship.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/v2/',
  build: {
    outDir: path.resolve(import.meta.dirname, '../v2'),
    emptyOutDir: true,
    sourcemap: false,
  },
  resolve: {
    // the "@/..." alias shadcn generates its imports against
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: { port: 5180 },
});
