import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

export const LICENSES_FILE = 'THIRD_PARTY_LICENSES';

/**
 * Ships THIRD_PARTY_LICENSES next to the app: the WASM core and other third-party code go to every
 * browser, so their license texts must travel with them (research.md R3).
 */
export function thirdPartyLicensesPlugin(source = LICENSES_FILE): Plugin {
  const read = () => readFileSync(source, 'utf8');
  return {
    name: 'dotmerlin-third-party-licenses',
    configureServer(server) {
      server.middlewares.use(`/${LICENSES_FILE}`, (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(read());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: LICENSES_FILE, source: read() });
    },
  };
}
