/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite + Vitest config for the static CLPS Lunar Mission Browser.
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js + three-stdlib + drei minify to ~900 kB on their own; gzip is
    // what ships over the wire (~260 kB) and the chunk only loads on demand
    // (SpaceCanvas / MapPage are React.lazy). The default 500 kB threshold
    // predates that reality.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Two vendor chunks, both reachable ONLY from React.lazy imports so
        // they stay out of the initial page load:
        //  - 'three'       : three.js + drei + fiber (shared by the lazy
        //                    SpaceCanvas and MapPage routes instead of being
        //                    duplicated into each route chunk).
        //  - 'react-vendor': the react runtime. Pinned explicitly because
        //                    otherwise Rollup folds it INTO the manual 'three'
        //                    chunk, which would make the entry chunk import
        //                    (and modulepreload) the whole 3D bundle.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            // Vite's \0-virtual build helpers. Unassigned, Rollup folds
            // \0vite/preload-helper.js into the manual 'three' chunk (it is
            // shared by entry + any chunk with dynamic imports), which would
            // make the entry chunk statically import the whole 3D bundle.
            if (id.includes('preload-helper') || id.includes('modulepreload-polyfill')) {
              return 'react-vendor';
            }
            return;
          }
          if (
            /node_modules[\\/](three|three-stdlib|@react-three|zustand|react-use-measure|suspend-react|its-fine|react-reconciler)[\\/]/.test(
              id,
            )
          ) {
            return 'three';
          }
          if (/node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/.test(id)) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
