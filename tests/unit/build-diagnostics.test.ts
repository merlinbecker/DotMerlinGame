// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDiagnostics, type DiagnosticTool } from '../../src/core/index.ts';

/** Real output of RGBDS v1.0.4 with --color never, recorded in tests/assembler/fixtures/. */
const parse = (name: string, tool: DiagnosticTool = 'rgbasm') =>
  parseDiagnostics(readFileSync(`tests/assembler/fixtures/${name}.txt`, 'utf8').split('\n'), tool);

describe('RGBDS diagnostics', () => {
  it('reads an error with its file and line, without the summary', () => {
    expect(parse('syntax')).toEqual([{ file: 'syntax.asm', line: 3, severity: 'error', message: 'Undefined macro `bogus`', tool: 'rgbasm' }]);
  });

  it('takes the innermost file of an include chain', () => {
    expect(parse('include')).toMatchObject([{ file: 'inc/b.inc', line: 3 }]);
  });

  it('takes the file and its line from inside a macro', () => {
    expect(parse('macro')).toMatchObject([{ file: 'mac.asm', line: 2 }]);
  });

  it('takes the file and line from inside REPT, one message per repetition', () => {
    expect(parse('rept')).toMatchObject([{ file: 'rept.asm', line: 3 }, { file: 'rept.asm', line: 3 }]);
  });

  it('marks warnings', () => {
    expect(parse('warning')).toMatchObject([{ file: 'warn.asm', line: 2, severity: 'warning' }]);
  });

  it('keeps the source location of a linker error', () => {
    expect(parse('link-undefined', 'rgblink')).toEqual([{ file: 'warn.asm', line: 3, severity: 'error', message: 'Undefined symbol `nowhere`', tool: 'rgblink' }]);
  });

  it('reads fatal errors without a location', () => {
    expect(parse('link-fatal', 'rgblink')).toMatchObject([{ file: null, line: null, severity: 'error' }]);
    expect(parse('fix-fatal', 'rgbfix')).toEqual([{ file: null, line: null, severity: 'error', message: 'Unknown MBC "BOGUS"', tool: 'rgbfix' }]);
  });

  it('reads an rgbfix warning without a location', () => {
    expect(parse('fix-warning', 'rgbfix')).toMatchObject([{ file: null, line: null, severity: 'warning', tool: 'rgbfix' }]);
  });

  it('never leaves color codes when none are requested', () => {
    for (const d of parse('syntax')) expect(d.message).not.toContain('\u001B');
  });
});
