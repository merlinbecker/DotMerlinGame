import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { PROJECT_NAME, PROJECT_SHORT_NAME } from '../src/config/project.ts';

const TOKENS_FILE = new URL('../src/app/theme/tokens.css', import.meta.url);

/** Reads a custom property from tokens.css so the manifest has no own color literals (research.md R16). */
export function readToken(css: string, name: string): string {
  const match = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(css);
  if (!match?.[1]) throw new Error(`Design token ${name} not found in tokens.css`);
  return match[1].trim();
}

export function createManifest(tokensCss: string) {
  return {
    name: PROJECT_NAME,
    short_name: PROJECT_SHORT_NAME,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: readToken(tokensCss, '--color-bg'),
    theme_color: readToken(tokensCss, '--color-fg'),
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/logo.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}

/**
 * Generates the web app manifest and the page title from the single project name and writes
 * build-info.json for the acceptance tests. Deliberately no service worker (FR-004).
 */
export function manifestPlugin(buildVersion: string): Plugin {
  const manifestJson = () => JSON.stringify(createManifest(readFileSync(TOKENS_FILE, 'utf8')), null, 2);

  return {
    name: 'dotmerlin-manifest',
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(manifestJson());
      });
    },
    transformIndexHtml() {
      return [
        { tag: 'title', children: PROJECT_NAME, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' }, injectTo: 'head' },
      ];
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifestJson() });
      this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ version: buildVersion }) });
    },
  };
}
