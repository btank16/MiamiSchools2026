import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // maplibre 6 finds its worker next to its own module, so it must not be pre-bundled in dev
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
