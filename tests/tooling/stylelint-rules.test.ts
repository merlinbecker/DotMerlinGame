// @vitest-environment node
import { resolve } from 'node:path';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const configFile = resolve('.stylelintrc.json');

async function ruleViolations(code: string, file: string): Promise<string[]> {
  const result = await stylelint.lint({ code, codeFilename: resolve(file), configFile });
  return (result.results[0]?.warnings ?? []).map((warning) => warning.rule);
}

const component = 'src/app/example/Example.module.css';
const tokens = 'src/app/theme/tokens.css';

describe('stylelint E-Ink rules', () => {
  it.each([
    ['hex color', '.a {\n  color: #000;\n}\n', 'color-no-hex'],
    ['px value', '.a {\n  margin: 4px;\n}\n', 'unit-disallowed-list'],
    ['transition', '.a {\n  transition: none;\n}\n', 'property-disallowed-list'],
    ['animation', '.a {\n  animation: none;\n}\n', 'property-disallowed-list'],
    ['hover state', '.a:hover {\n  color: var(--color-fg);\n}\n', 'selector-pseudo-class-disallowed-list'],
  ])('rejects a %s in component styles', async (_name, code, rule) => {
    expect(await ruleViolations(code, component)).toContain(rule);
  });

  it('allows literal colors and sizes in tokens.css', async () => {
    const code = ':root {\n  --color-fg: #000;\n  --space-1: 4px;\n  --duration-short: 0ms;\n}\n';
    expect(await ruleViolations(code, tokens)).toEqual([]);
  });

  it('accepts token-based component styles', async () => {
    const code = '.a {\n  color: var(--color-fg);\n  padding: var(--space-2);\n}\n';
    expect(await ruleViolations(code, component)).toEqual([]);
  });
});
