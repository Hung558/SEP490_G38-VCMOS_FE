import react from '@vitejs/plugin-react';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/locales': path.resolve(__dirname, './src/locales'),

      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/redux': path.resolve(__dirname, './src/redux'),
      '@/assets': path.resolve(__dirname, './src/assets'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@repo/types': path.resolve(__dirname, './src/types'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
  // base: '/boc-bang/',
  plugins: [react()],

  build: {
    outDir: 'dist',
    sourcemap: true,
    // Mặc định Vite là 500 (kB). Tăng lên 2000 (kB) hoặc lớn hơn
    chunkSizeWarningLimit: 2000,
    // Nếu muốn “vô hiệu” hẳn cảnh báo, đặt thành một số rất lớn:
    // chunkSizeWarningLimit: 10000,
  },

  server: {
    port: 3000,
    open: true,
  },
});
