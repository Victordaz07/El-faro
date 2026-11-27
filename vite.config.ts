import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' para que funcione dentro de Capacitor; single-file para publicarlo como una sola página
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  // Las imágenes se incrustan como data URI para que el juego siga siendo un solo archivo
  build: { target: 'es2019', assetsInlineLimit: 100_000_000 },
});
