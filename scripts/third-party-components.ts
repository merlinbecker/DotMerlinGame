// Shipped components outside npm (e.g. the SameBoy WASM core), described by third_party/<component>.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateLicenses } from './license-policy.ts';

const THIRD_PARTY_DIR = 'third_party';
const NOT_COMPONENTS = new Set(['README.md', 'npm.md']);
const FIELDS = ['name', 'version', 'license', 'licenseFile', 'source', 'commit'] as const;

export interface Component {
  readonly file: string;
  readonly name: string;
  readonly version: string;
  /** SPDX expression, checked against the runtime allowlist. */
  readonly license: string;
  /** Relative to third_party/. */
  readonly licenseFile: string;
  readonly source: string;
  /** Commit hash, image digest or other immutable reference. */
  readonly commit: string;
}

export function parseComponent(text: string, file: string): Component {
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match?.[1]) throw new Error(`${file}: missing front matter`);
  const values = new Map<string, string>();
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator > 0) values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  for (const field of FIELDS) {
    if (!values.get(field)) throw new Error(`${file}: missing field ${field}`);
  }
  const get = (field: (typeof FIELDS)[number]) => values.get(field) ?? '';
  const component: Component = {
    file,
    name: get('name'),
    version: get('version'),
    license: get('license'),
    licenseFile: get('licenseFile'),
    source: get('source'),
    commit: get('commit'),
  };
  const [result] = evaluateLicenses([{ name: component.name, version: component.version, license: component.license, scope: 'runtime' }], []);
  if (result?.verdict !== 'ok') throw new Error(`${file}: license ${component.license} is not on the runtime allowlist`);
  return component;
}

export function readComponents(dir = THIRD_PARTY_DIR): Component[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !NOT_COMPONENTS.has(name))
    .sort()
    .map((name) => parseComponent(readFileSync(join(dir, name), 'utf8'), name));
}

export function readComponentLicense(component: Component, dir = THIRD_PARTY_DIR): string {
  const path = join(dir, component.licenseFile);
  if (!existsSync(path)) throw new Error(`${component.file}: license file ${path} not found`);
  return readFileSync(path, 'utf8').trim();
}
