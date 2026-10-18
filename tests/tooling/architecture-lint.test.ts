// @vitest-environment node
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Probe files do not exist on disk: lint without type information and only check the import rules.
const eslint = new ESLint({
  overrideConfig: { languageOptions: { parserOptions: { projectService: false } } },
  ruleFilter: ({ ruleId }) => ruleId === 'no-restricted-imports',
});

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? 'fatal');
}

describe('architecture rules as lint (Constitution II, III)', () => {
  it('forbids views to import adapters', async () => {
    expect(await ruleIds("import { createIndexedDbRomStore } from '../../adapters/storage/indexeddb-rom-store.ts';\nexport const x = createIndexedDbRomStore;\n", 'src/views/screen/probe.ts')).toContain('no-restricted-imports');
  });

  it('forbids views to import the session', async () => {
    expect(await ruleIds("import { createEmulatorSession } from '../../app/session/emulator-session.ts';\nexport const x = createEmulatorSession;\n", 'src/views/screen/probe.ts')).toContain('no-restricted-imports');
  });

  it('forbids everyone but the SameBoy adapter to load the WASM module', async () => {
    expect(await ruleIds("import createSameBoy from '../adapters/emulator/sameboy/generated/sameboy.mjs';\nexport const x = createSameBoy;\n", 'src/app/probe.ts')).toContain('no-restricted-imports');
  });

  it('forbids core to import outer layers', async () => {
    expect(await ruleIds("import { Grid } from '../app/layout/Grid.tsx';\nexport const x = Grid;\n", 'src/core/probe.ts')).toContain('no-restricted-imports');
  });
});
