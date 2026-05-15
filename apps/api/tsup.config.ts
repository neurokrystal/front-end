import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: [/@dimensional/],
  // Don't bundle node_modules except @dimensional/shared
  external: [/node_modules/],
  esbuildOptions(options) {
    options.alias = { '@': './src' } as any;
  },
});
