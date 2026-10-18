// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const secretlint = resolve('node_modules/.bin/secretlint');
const config = resolve('.secretlintrc.json');
const dir = mkdtempSync(join(tmpdir(), 'secret-scan-'));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scan(content: string): number {
  const file = join(dir, `sample-${String(Math.random()).slice(2)}.txt`);
  writeFileSync(file, content);
  try {
    execFileSync(secretlint, ['--secretlintrc', config, '--maskSecrets', file], { stdio: 'pipe' });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? 1;
  }
}

/** Builds a token-shaped string at runtime so no secret-like literal is ever committed. */
function fakeGithubToken(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let body = '';
  for (let i = 0; i < 36; i++) body += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return ['gh', 'p_'].join('') + body;
}

describe('secret scan', () => {
  it('detects a generated credential', () => {
    expect(scan(`token=${fakeGithubToken()}\n`)).not.toBe(0);
  });

  it('accepts a file without secrets', () => {
    expect(scan('just some text\n')).toBe(0);
  });
});
