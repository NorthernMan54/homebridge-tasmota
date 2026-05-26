import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // environment: 'node',
    // reporters: ['verbose'],
     fileParallelism: false,
    include: ['test/**/*.test.ts'],
  },
  plugins: [
    swc.vite({
      module: {
        type: 'es6',
      },
    }),
  ],
});
