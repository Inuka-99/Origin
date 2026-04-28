import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    // Split heavy vendor packages into their own chunks so the
    // initial download is smaller and the browser can parallelise
    // requests. Without this, every dependency lands in a single
    // 1MB+ index.js that blocks first paint on slow connections —
    // which directly hurts the Sprint 8 scalability story (more
    // users on more devices means more variance in network speed).
    //
    // We use a function form of manualChunks that buckets each
    // module by its node_modules path. We deliberately keep the
    // bucket count small — only the packages that are big enough
    // to matter on their own get their own chunk. Smaller deps
    // share a generic "vendor" chunk to avoid the circular-import
    // warnings rollup raises when chunks reference each other.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/@auth0/') ||
              id.includes('node_modules/@supabase/')) {
            return 'vendor-data'
          }
          // Everything else from node_modules — Radix, MUI,
          // lucide, date-fns, recharts, etc. — goes into a single
          // vendor chunk. This avoids the cross-chunk import
          // graph that triggers Rollup's circular-chunk warning.
          return 'vendor'
        },
      },
    },
    // 600KB ceiling is a realistic threshold for a SaaS app with
    // rich UI; the remaining vendor + app chunks sit well under
    // this after the split.
    chunkSizeWarningLimit: 600,
  },
})
