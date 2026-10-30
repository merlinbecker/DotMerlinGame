// SM83 instruction set in RGBDS syntax, from RGBDS gbz80(7) v1.0.4 and Pan Docs "CPU Instruction Set".
// tests/assembler/opcodes.test.ts assembles every entry with rgbasm and compares the bytes (M3 FR-011).

export type Flow = 'next' | 'jump' | 'branch' | 'call' | 'end';
type Operand = 'none' | 'n8' | 'n16' | 'e8' | 'high' | 'rel' | 'target16';

interface Opcode {
  readonly length: 1 | 2 | 3;
  readonly flow: Flow;
  readonly operand: Operand;
  /** `#` marks the operand. */
  readonly template: string;
  /** Fixed target of `rst`. */
  readonly vector?: number;
}

export interface Instruction {
  readonly length: number;
  readonly flow: Flow;
  /** The 16-bit target of a jump or call, if it is static. */
  readonly target: number | null;
  /** Source text; `label` names the target if the caller knows one. */
  text(label: string | null): string;
}

const R8 = ['b', 'c', 'd', 'e', 'h', 'l', '[hl]', 'a'];
const R16 = ['bc', 'de', 'hl', 'sp'];
const R16_STACK = ['bc', 'de', 'hl', 'af'];
const R16_MEMORY = ['[bc]', '[de]', '[hl+]', '[hl-]'];
const CONDITION = ['nz', 'z', 'nc', 'c'];
const ALU = ['add a,', 'adc a,', 'sub a,', 'sbc a,', 'and a,', 'xor a,', 'or a,', 'cp a,'];
const ROTATE = ['rlca', 'rrca', 'rla', 'rra', 'daa', 'cpl', 'scf', 'ccf'];
const CB_SHIFT = ['rlc', 'rrc', 'rl', 'rr', 'sla', 'sra', 'swap', 'srl'];
/** Not assigned on the SM83 (Pan Docs "CPU opcode table"). */
const INVALID = new Set([0xd3, 0xdb, 0xdd, 0xe3, 0xe4, 0xeb, 0xec, 0xed, 0xf4, 0xfc, 0xfd]);

const plain = (template: string, flow: Flow = 'next'): Opcode => ({ length: 1, flow, operand: 'none', template });
const with8 = (template: string): Opcode => ({ length: 2, flow: 'next', operand: 'n8', template });
const with16 = (template: string): Opcode => ({ length: 3, flow: 'next', operand: 'n16', template });
const relative = (template: string, flow: Flow): Opcode => ({ length: 2, flow, operand: 'rel', template });
const target16 = (template: string, flow: Flow): Opcode => ({ length: 3, flow, operand: 'target16', template });

function at(list: readonly string[], index: number): string {
  return list[index] ?? '';
}

function baseOpcode(op: number): Opcode | null {
  if (INVALID.has(op)) return null;
  const x = op >> 6;
  const y = (op >> 3) & 7;
  const z = op & 7;
  const p = y >> 1;
  const q = y & 1;
  if (x === 1) return op === 0x76 ? plain('halt') : plain(`ld ${at(R8, y)},${at(R8, z)}`);
  if (x === 2) return plain(`${at(ALU, y)}${at(R8, z)}`);
  if (x === 0) {
    switch (z) {
      case 0:
        if (y === 0) return plain('nop');
        if (y === 1) return with16('ld [#],sp');
        if (y === 2) return null; // stop: decoded separately, it needs its second byte
        if (y === 3) return relative('jr #', 'jump');
        return relative(`jr ${at(CONDITION, y - 4)},#`, 'branch');
      case 1:
        return q === 0 ? with16(`ld ${at(R16, p)},#`) : plain(`add hl,${at(R16, p)}`);
      case 2:
        return q === 0 ? plain(`ld ${at(R16_MEMORY, p)},a`) : plain(`ld a,${at(R16_MEMORY, p)}`);
      case 3:
        return plain(`${q === 0 ? 'inc' : 'dec'} ${at(R16, p)}`);
      case 4:
        return plain(`inc ${at(R8, y)}`);
      case 5:
        return plain(`dec ${at(R8, y)}`);
      case 6:
        return with8(`ld ${at(R8, y)},#`);
      default:
        return plain(at(ROTATE, y));
    }
  }
  switch (op) {
    case 0xc3:
      return target16('jp #', 'jump');
    case 0xc9:
      return plain('ret', 'end');
    case 0xcd:
      return target16('call #', 'call');
    case 0xd9:
      return plain('reti', 'end');
    case 0xe0:
      return { length: 2, flow: 'next', operand: 'high', template: 'ldh [#],a' };
    case 0xe2:
      return plain('ldh [c],a');
    case 0xe8:
      return { length: 2, flow: 'next', operand: 'e8', template: 'add sp,#' };
    case 0xe9:
      return plain('jp hl', 'end');
    case 0xea:
      return with16('ld [#],a');
    case 0xf0:
      return { length: 2, flow: 'next', operand: 'high', template: 'ldh a,[#]' };
    case 0xf2:
      return plain('ldh a,[c]');
    case 0xf3:
      return plain('di');
    case 0xf8:
      return { length: 2, flow: 'next', operand: 'e8', template: 'ld hl,sp+#' };
    case 0xf9:
      return plain('ld sp,hl');
    case 0xfa:
      return with16('ld a,[#]');
    case 0xfb:
      return plain('ei');
  }
  switch (z) {
    case 0:
      return plain(`ret ${at(CONDITION, y)}`, 'next');
    case 1:
      return plain(`pop ${at(R16_STACK, p)}`);
    case 2:
      return target16(`jp ${at(CONDITION, y)},#`, 'branch');
    case 4:
      return target16(`call ${at(CONDITION, y)},#`, 'call');
    case 5:
      return plain(`push ${at(R16_STACK, p)}`);
    case 6:
      return with8(`${at(ALU, y)}#`);
    case 7:
      return { length: 1, flow: 'call', operand: 'none', template: `rst $${(y * 8).toString(16).toUpperCase().padStart(2, '0')}`, vector: y * 8 };
    default:
      return null;
  }
}

function cbText(op: number): string {
  const y = (op >> 3) & 7;
  const r = at(R8, op & 7);
  switch (op >> 6) {
    case 0:
      return `${at(CB_SHIFT, y)} ${r}`;
    case 1:
      return `bit ${String(y)},${r}`;
    case 2:
      return `res ${String(y)},${r}`;
    default:
      return `set ${String(y)},${r}`;
  }
}

const hex = (value: number, digits: number) => `$${value.toString(16).toUpperCase().padStart(digits, '0')}`;
const signed = (byte: number) => (byte >= 0x80 ? byte - 0x100 : byte);

/** One instruction at `offset`, or null if the bytes there cannot be code that rgbasm rebuilds identically. */
export function decode(bytes: Uint8Array, offset: number, end: number = bytes.length): Instruction | null {
  if (offset >= end) return null;
  const op = bytes[offset] ?? 0;
  const second = bytes[offset + 1];
  if (op === 0xcb) {
    if (offset + 2 > end || second === undefined) return null;
    const text = cbText(second);
    return { length: 2, flow: 'next', target: null, text: () => text };
  }
  if (op === 0x10) {
    // rgbasm writes `stop` as $10 $00; any other second byte is only representable as data (research.md R2).
    if (offset + 2 > end || second !== 0) return null;
    return { length: 2, flow: 'next', target: null, text: () => 'stop' };
  }
  const entry = baseOpcode(op);
  if (!entry || offset + entry.length > end) return null;
  const low = second ?? 0;
  const word = low | ((bytes[offset + 2] ?? 0) << 8);
  return {
    length: entry.length,
    flow: entry.flow,
    target: entry.operand === 'target16' ? word : (entry.vector ?? null),
    text(label) {
      switch (entry.operand) {
        case 'none':
          return entry.template;
        case 'n8':
          return entry.template.replace('#', hex(low, 2));
        case 'n16':
          return entry.template.replace('#', hex(word, 4));
        case 'high':
          return entry.template.replace('#', hex(0xff00 + low, 4));
        case 'e8': {
          const value = signed(low);
          // `ld hl,sp+-1` is valid RGBDS, so the template keeps its plus sign.
          return entry.template.replace('#', String(value));
        }
        case 'target16':
          return entry.template.replace('#', label ?? hex(word, 4));
        case 'rel': {
          if (label) return entry.template.replace('#', label);
          const delta = signed(low) + 2;
          return entry.template.replace('#', delta < 0 ? `@${String(delta)}` : `@+${String(delta)}`);
        }
      }
    },
  };
}

/** Target of a relative jump, for the analysis. */
export function relativeTarget(bytes: Uint8Array, offset: number, address: number): number | null {
  const op = bytes[offset] ?? 0;
  if (op !== 0x18 && op !== 0x20 && op !== 0x28 && op !== 0x30 && op !== 0x38) return null;
  return address + 2 + signed(bytes[offset + 1] ?? 0);
}
