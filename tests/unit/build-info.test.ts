// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseComponent } from '../../scripts/third-party-components.ts';

const GENERATED = 'src/adapters/emulator/sameboy/generated';

interface BuildInfo {
  sameboyRepo: string;
  sameboyCommit: string;
  emsdkImage: string;
  sha256: Record<string, string>;
}

const script = readFileSync('scripts/build-core.sh', 'utf8');
const info = JSON.parse(readFileSync(`${GENERATED}/BUILD-INFO.json`, 'utf8')) as BuildInfo;
const sameboy = parseComponent(readFileSync('third_party/sameboy.md', 'utf8'), 'sameboy.md');
const emscripten = parseComponent(readFileSync('third_party/emscripten.md', 'utf8'), 'emscripten.md');

function scriptConstant(name: string): string | undefined {
  return new RegExp(`^${name}=(\\S+)$`, 'm').exec(script)?.[1];
}

describe('pinned SameBoy build (contracts/build-pipeline.md)', () => {
  it('uses the same SameBoy commit in script, BUILD-INFO.json and third_party/sameboy.md', () => {
    expect(scriptConstant('SAMEBOY_COMMIT')).toBe(info.sameboyCommit);
    expect(sameboy.commit).toBe(info.sameboyCommit);
    expect(scriptConstant('SAMEBOY_REPO')).toBe(info.sameboyRepo);
    expect(sameboy.source).toBe(info.sameboyRepo);
  });

  it('uses the same emsdk image digest in script, BUILD-INFO.json and third_party/emscripten.md', () => {
    expect(scriptConstant('EMSDK_IMAGE')).toBe(info.emsdkImage);
    expect(emscripten.commit).toBe(info.emsdkImage);
    expect(info.emsdkImage).toMatch(/@sha256:[0-9a-f]{64}$/);
  });

  it.each(['sameboy.mjs', 'sameboy.wasm'])('matches the recorded SHA-256 of %s', (file) => {
    const digest = createHash('sha256').update(readFileSync(`${GENERATED}/${file}`)).digest('hex');
    expect(digest).toBe(info.sha256[file]);
  });
});
