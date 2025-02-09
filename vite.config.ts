import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';

export default defineConfig({
  plugins: [react({
    // plugins: [['@preact-signals/safe-react/swc', {}]]
  })],
  preview: {
    port: 3000,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        build: 'src/build.ts',
        dev: 'src/ha-dev.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'dev') {
            return 'ha-dev.js';
          }
          return 'ha-custom-cards.js';
        },
        chunkFileNames: `[name].js`,
        assetFileNames: `[hash].[ext]`,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
