export type TokenKind = 'instruction' | 'label' | 'comment' | 'number';

export interface Token {
  readonly from: number;
  readonly to: number;
  readonly kind: TokenKind;
}

// Instructions of RGBDS gbz80(7), v1.0.4.
const INSTRUCTIONS = new Set(
  'adc add and bit call ccf cp cpl daa dec di ei halt inc jp jr ld ldh nop or pop push res ret reti rl rla rlc rlca rr rra rrc rrca rst sbc scf set sla sra srl stop sub swap xor'.split(' '),
);
const IDENTIFIER_START = /[A-Za-z_.]/;
const IDENTIFIER = /[A-Za-z0-9_.#@$]*/y;
const NUMBER = /(\$[0-9A-Fa-f_]+|%[01_]+|&[0-7_]+|[0-9][0-9_]*)/y;

/** Marks one source line for the editor; simple on purpose, it never decides anything for the build. */
export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let firstWord = true;
  while (i < line.length) {
    const char = line.charAt(i);
    if (char === ';') {
      tokens.push({ from: i, to: line.length, kind: 'comment' });
      break;
    }
    if (char === '"') {
      i++;
      while (i < line.length && line[i] !== '"') i += line[i] === '\\' ? 2 : 1;
      i++;
      continue;
    }
    if (IDENTIFIER_START.test(char)) {
      IDENTIFIER.lastIndex = i;
      const word = IDENTIFIER.exec(line)?.[0] ?? '';
      const end = i + word.length;
      if (firstWord && i === 0 && (line[end] === ':' || word.startsWith('.'))) tokens.push({ from: i, to: end, kind: 'label' });
      else if (firstWord && word.startsWith('.') && line[end] === ':') tokens.push({ from: i, to: end, kind: 'label' });
      else if (INSTRUCTIONS.has(word.toLowerCase())) tokens.push({ from: i, to: end, kind: 'instruction' });
      if (!(i === 0 && line[end] === ':')) firstWord = false;
      i = end;
      continue;
    }
    NUMBER.lastIndex = i;
    const number = NUMBER.exec(line)?.[0];
    if (number) {
      tokens.push({ from: i, to: i + number.length, kind: 'number' });
      i += number.length;
      continue;
    }
    i++;
  }
  return tokens;
}
