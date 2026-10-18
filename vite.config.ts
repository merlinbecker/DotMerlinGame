import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveBuildVersion } from './build/build-version.ts';
import { manifestPlugin } from './build/manifest-plugin.ts';

const buildVersion = resolveBuildVersion();

export default defineConfig({
  plugins: [react(), manifestPlugin(buildVersion)],
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
