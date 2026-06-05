import { defineConfig } from 'vite';
import { sallaBuildPlugin, sallaTransformPlugin, sallaDemoPlugin } from '@salla.sa/twilight-bundles/vite-plugins';

export default defineConfig({
  plugins: [
    sallaTransformPlugin(),
    sallaBuildPlugin(),
    sallaDemoPlugin(),
  ],
});
