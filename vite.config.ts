import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' para que funcione dentro de Capacitor; single-file para publicarlo como una sola página
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2019' },
});
