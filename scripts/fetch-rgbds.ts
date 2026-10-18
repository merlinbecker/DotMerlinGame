// Downloads the pinned RGBDS release into .tools/rgbds (development tool, not shipped; research.md R11).
//   node scripts/fetch-rgbds.ts
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { arch, platform, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const RGBDS_VERSION = '1.0.4';
const ARCHIVE_URL = `https://github.com/gbdev/rgbds/releases/download/v${RGBDS_VERSION}/rgbds-linux-x86_64.tar.xz`;
const ARCHIVE_SHA256 = '3e19e50ea602e316be709160acaf0a708b1fa6d32d219ec541f244442895dbb7';

export interface RgbdsPaths {
  readonly dir: string;
  readonly rgbasm: string;
  readonly rgblink: string;
  readonly rgbfix: string;
}

export function rgbdsPaths(root: string): RgbdsPaths {
  const dir = join(root, '.tools', 'rgbds');
  return { dir, rgbasm: join(dir, 'rgbasm'), rgblink: join(dir, 'rgblink'), rgbfix: join(dir, 'rgbfix') };
}

export function verifySha256(data: Uint8Array, expected: string): void {
  const actual = createHash('sha256').update(data).digest('hex');
  if (actual !== expected) throw new Error(`SHA-256 mismatch: expected ${expected}, got ${actual}`);
}

function installedVersion(paths: RgbdsPaths): string | undefined {
  if (!existsSync(paths.rgbasm)) return undefined;
  try {
    return execFileSync(paths.rgbasm, ['-V'], { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

export async function fetchRgbds(root: string): Promise<RgbdsPaths> {
  const paths = rgbdsPaths(root);
  if (installedVersion(paths)?.includes(RGBDS_VERSION)) return paths;
  if (platform() !== 'linux' || arch() !== 'x64') {
    throw new Error(`RGBDS download supports Linux x86_64 only (this is ${platform()}/${arch()}). Install RGBDS v${RGBDS_VERSION} into ${paths.dir} by hand.`);
  }

  const response = await fetch(ARCHIVE_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${ARCHIVE_URL}`);
  const archive = new Uint8Array(await response.arrayBuffer());
  verifySha256(archive, ARCHIVE_SHA256);

  const work = mkdtempSync(join(tmpdir(), 'rgbds-'));
  try {
    const file = join(work, 'rgbds.tar.xz');
    writeFileSync(file, archive);
    rmSync(paths.dir, { recursive: true, force: true });
    mkdirSync(paths.dir, { recursive: true });
    execFileSync('tar', ['-xJf', file, '-C', paths.dir]);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  const version = installedVersion(paths);
  if (!version?.includes(RGBDS_VERSION)) throw new Error(`RGBDS not usable after extraction (got: ${version ?? 'nothing'})`);
  return paths;
}

if (import.meta.main) {
  const paths = await fetchRgbds(resolve('.'));
  console.log(`RGBDS ${RGBDS_VERSION} ready in ${paths.dir}`);
}
