import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { resolveBuildVersion } from './build/build-version.ts';
import { manifestPlugin } from './build/manifest-plugin.ts';
import { thirdPartyLicensesPlugin } from './build/third-party-licenses-plugin.ts';
import packageJson from './package.json' with { type: 'json' };

const buildVersion = resolveBuildVersion();
const appVersion = packageJson.version;

export default defineConfig({
  plugins: [react(), manifestPlugin({ appVersion, buildVersion }), thirdPartyLicensesPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  server: {
    host: true,
    port: 5000,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
  },
});
