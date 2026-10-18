// @vitest-environment node
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RGBDS_VERSION, rgbdsPaths, verifySha256 } from '../../scripts/fetch-rgbds.ts';

describe('fetch-rgbds', () => {
  const data = new TextEncoder().encode('rgbds');
  const digest = createHash('sha256').update(data).digest('hex');

  it('accepts a matching SHA-256', () => {
    expect(() => {
      verifySha256(data, digest);
    }).not.toThrow();
  });

  it('rejects a mismatching SHA-256', () => {
    expect(() => {
      verifySha256(data, '0'.repeat(64));
    }).toThrow(/SHA-256 mismatch/);
  });

  it('pins version 1.0.4', () => {
    expect(RGBDS_VERSION).toBe('1.0.4');
  });

  it('puts the binaries under .tools/rgbds', () => {
    const paths = rgbdsPaths('/repo');
    expect(paths.dir).toBe(join('/repo', '.tools', 'rgbds'));
    expect(paths.rgbasm).toBe(join('/repo', '.tools', 'rgbds', 'rgbasm'));
    expect(paths.rgblink).toBe(join('/repo', '.tools', 'rgbds', 'rgblink'));
    expect(paths.rgbfix).toBe(join('/repo', '.tools', 'rgbds', 'rgbfix'));
  });
});
