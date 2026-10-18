import { describe, expect, it } from 'vitest';
import { evaluateLicenses, type LicenseException, type PackageLicense } from '../../scripts/license-policy.ts';

function verdict(scope: PackageLicense['scope'], license: string | undefined, exceptions: LicenseException[] = []) {
  const [result] = evaluateLicenses([{ name: 'pkg', version: '1.0.0', license, scope }], exceptions);
  return result?.verdict;
}

describe('runtime dependencies (strict allowlist)', () => {
  it.each(['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Apache-2.0', 'Zlib', '0BSD', 'CC0-1.0', 'Unlicense'])(
    'accepts %s',
    (license) => {
      expect(verdict('runtime', license)).toBe('ok');
    },
  );

  it.each(['MPL-2.0', 'GPL-3.0', 'LGPL-2.1-only', 'BlueOak-1.0.0', 'UNLICENSED', 'UNKNOWN', 'MIT*'])('blocks %s', (license) => {
    expect(verdict('runtime', license)).toBe('blocked');
  });

  it('blocks a missing license', () => {
    expect(verdict('runtime', undefined)).toBe('blocked');
  });

  it('accepts an OR expression with one allowed license', () => {
    expect(verdict('runtime', '(MIT OR GPL-3.0)')).toBe('ok');
  });

  it('blocks an AND expression with one disallowed license', () => {
    expect(verdict('runtime', '(MIT AND CC-BY-3.0)')).toBe('blocked');
  });
});

describe('dev dependencies (copyleft and unknown blocked)', () => {
  it.each(['BlueOak-1.0.0', 'MIT-0', 'Python-2.0', 'MPL-2.0', 'CC-BY-3.0', 'WTFPL'])('lists %s', (license) => {
    expect(verdict('dev', license)).toBe('listed');
  });

  it('accepts allowlisted licenses', () => {
    expect(verdict('dev', 'MIT')).toBe('ok');
  });

  it.each(['GPL-3.0-or-later', 'GPL-2.0-only', 'LGPL-2.1-only', 'LGPL-3.0', 'AGPL-3.0', 'SSPL-1.0', '(MIT AND GPL-3.0)'])(
    'blocks %s',
    (license) => {
      expect(verdict('dev', license)).toBe('blocked');
    },
  );

  it.each(['UNKNOWN', 'UNLICENSED', ''])('blocks unknown license %j', (license) => {
    expect(verdict('dev', license)).toBe('blocked');
  });

  it('blocks a missing license', () => {
    expect(verdict('dev', undefined)).toBe('blocked');
  });

  it('accepts copyleft only as an alternative', () => {
    expect(verdict('dev', '(MIT OR GPL-3.0)')).toBe('ok');
  });
});

describe('exceptions', () => {
  it('accepts a blocked package with an ADR-backed exception', () => {
    expect(verdict('runtime', 'MPL-2.0', [{ package: 'pkg', license: 'MPL-2.0', adr: 'docs/adr/0011-example.md' }])).toBe('ok');
  });

  it('rejects exceptions without an ADR reference', () => {
    expect(() => verdict('runtime', 'MPL-2.0', [{ package: 'pkg', license: 'MPL-2.0', adr: '' }])).toThrow(/ADR/);
  });

  it('does not apply an exception to another license', () => {
    expect(verdict('runtime', 'GPL-3.0', [{ package: 'pkg', license: 'MPL-2.0', adr: 'docs/adr/0011-example.md' }])).toBe(
      'blocked',
    );
  });
});
