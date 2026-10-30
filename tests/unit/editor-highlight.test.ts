import { describe, expect, it } from 'vitest';
import { tokenizeLine, type TokenKind } from '../../src/core/index.ts';

const kinds = (line: string): [string, TokenKind][] => tokenizeLine(line).map((t) => [line.slice(t.from, t.to), t.kind]);

describe('source highlighting', () => {
  it('marks instructions in any case', () => {
    expect(kinds('    ld a, 1')).toEqual([['ld', 'instruction'], ['1', 'number']]);
    expect(kinds('    NOP')).toEqual([['NOP', 'instruction']]);
  });

  it('marks labels, global and local', () => {
    expect(kinds('Main:')).toEqual([['Main', 'label']]);
    expect(kinds('.loop: jr .loop')).toEqual([['.loop', 'label'], ['jr', 'instruction']]);
  });

  it('marks all number forms', () => {
    expect(kinds(' db $FF, %101, &7, 12')).toEqual([['$FF', 'number'], ['%101', 'number'], ['&7', 'number'], ['12', 'number']]);
  });

  it('marks a comment to the end of the line', () => {
    expect(kinds('nop ; ld a, 1')).toEqual([['nop', 'instruction'], ['; ld a, 1', 'comment']]);
  });

  it('does not start a comment inside a string', () => {
    expect(kinds(' db "a;b", 1')).toEqual([['1', 'number']]);
  });

  it('does not take identifiers for instructions', () => {
    expect(kinds(' jp ldLoop')).toEqual([['jp', 'instruction']]);
  });
});
