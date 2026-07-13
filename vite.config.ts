import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Static SPA. Data is fetched at build time (scripts/fetch-data.mjs, run via
// prebuild) and written to public/data/wiki.json, which Vite copies verbatim.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
