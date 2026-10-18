import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveBuildVersion } from './build/build-version.ts';

const buildVersion = resolveBuildVersion();

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
});
