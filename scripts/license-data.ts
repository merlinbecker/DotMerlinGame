// Reads installed package licenses via license-checker-rseidelsohn.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PackageLicense } from './license-policy.ts';

interface CheckerEntry {
  licenses?: string | string[];
  repository?: string;
  licenseFile?: string;
}

export interface InstalledPackage extends PackageLicense {
  readonly repository: string | undefined;
  readonly licenseFile: string | undefined;
}

function splitKey(key: string): { name: string; version: string } {
  const at = key.lastIndexOf('@');
  return { name: key.slice(0, at), version: key.slice(at + 1) };
}

export function readPackages(scope: PackageLicense['scope']): InstalledPackage[] {
  const output = execFileSync(
    resolve('node_modules/.bin/license-checker-rseidelsohn'),
    ['--json', '--excludePrivatePackages', scope === 'runtime' ? '--production' : '--development'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const entries = JSON.parse(output) as Record<string, CheckerEntry>;
  return Object.entries(entries)
    .map(([key, entry]) => ({
      ...splitKey(key),
      license: Array.isArray(entry.licenses) ? entry.licenses.join(' AND ') : entry.licenses,
      scope,
      repository: entry.repository,
      licenseFile: entry.licenseFile,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function readLicenseText(pkg: InstalledPackage): string {
  if (!pkg.licenseFile) throw new Error(`No license file found for ${pkg.name}@${pkg.version}`);
  return readFileSync(pkg.licenseFile, 'utf8').trim();
}
