// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseComponent } from '../../scripts/third-party-components.ts';

const valid = `---
name: SameBoy Core
version: v1.0.4
license: MIT
licenseFile: licenses/sameboy-LICENSE
source: https://github.com/LIJI32/SameBoy
commit: 26a56bd6a122a6318a456abd80558408742d5adf
---

# SameBoy
`;

describe('third_party component front matter', () => {
  it('parses all fields', () => {
    expect(parseComponent(valid, 'sameboy.md')).toEqual({
      file: 'sameboy.md',
      name: 'SameBoy Core',
      version: 'v1.0.4',
      license: 'MIT',
      licenseFile: 'licenses/sameboy-LICENSE',
      source: 'https://github.com/LIJI32/SameBoy',
      commit: '26a56bd6a122a6318a456abd80558408742d5adf',
    });
  });

  it.each(['name', 'version', 'license', 'licenseFile', 'source', 'commit'])('rejects a missing %s', (field) => {
    const text = valid.replace(new RegExp(`^${field}:.*\\n`, 'm'), '');
    expect(() => parseComponent(text, 'x.md')).toThrow(new RegExp(field));
  });

  it('rejects a file without front matter', () => {
    expect(() => parseComponent('# no front matter', 'x.md')).toThrow(/front matter/);
  });

  it('rejects a license that is not on the shipped allowlist', () => {
    expect(() => parseComponent(valid.replace('license: MIT', 'license: GPL-3.0'), 'x.md')).toThrow(/allowlist/);
  });

  it('accepts an OR expression with an allowed license', () => {
    expect(parseComponent(valid.replace('license: MIT', 'license: MIT OR NCSA'), 'x.md').license).toBe('MIT OR NCSA');
  });
});
