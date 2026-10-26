import type { FrameSnapshot, ViewInstanceProps } from '../../core/index.ts';
import { InspectNotice } from '../inspect-common/Notice.tsx';
import { RateBar } from '../inspect-common/RateBar.tsx';
import { useChanges } from '../inspect-common/useChanges.ts';
import { useInspection } from '../inspect-common/useInspection.ts';
import common from '../inspect-common/Inspect.module.css';
import type { RegistersViewState } from './definition.ts';
import styles from './RegistersView.module.css';

const hex = (value: number, digits: number) => `$${value.toString(16).toUpperCase().padStart(digits, '0')}`;

interface Field {
  readonly name: string;
  readonly text: string;
  /** Indices into the compared value list; a field is marked when any of them changed. */
  readonly parts: readonly number[];
}

/** All shown values in one list, so a change since the last update can be marked (FR-011). */
function values(snapshot: FrameSnapshot): Uint8Array {
  const r = snapshot.registers;
  const cpu = snapshot.inspection?.cpu;
  return Uint8Array.of(r.a, r.f, r.b, r.c, r.d, r.e, r.h, r.l, r.sp >> 8, r.sp & 0xff, r.pc >> 8, r.pc & 0xff, cpu?.ime ? 1 : 0, cpu?.halted ? 1 : 0);
}

function fields(snapshot: FrameSnapshot): { registers: Field[]; pairs: Field[]; cpu: Field[] } {
  const r = snapshot.registers;
  const cpu = snapshot.inspection?.cpu;
  const byte = (name: string, value: number, part: number): Field => ({ name, text: hex(value, 2), parts: [part] });
  const word = (name: string, high: number, low: number, parts: readonly number[]): Field => ({ name, text: hex((high << 8) | low, 4), parts });
  return {
    registers: [byte('A', r.a, 0), byte('F', r.f, 1), byte('B', r.b, 2), byte('C', r.c, 3), byte('D', r.d, 4), byte('E', r.e, 5), byte('H', r.h, 6), byte('L', r.l, 7)],
    pairs: [
      word('BC', r.b, r.c, [2, 3]),
      word('DE', r.d, r.e, [4, 5]),
      word('HL', r.h, r.l, [6, 7]),
      { name: 'SP', text: hex(r.sp, 4), parts: [8, 9] },
      { name: 'PC', text: hex(r.pc, 4), parts: [10, 11] },
    ],
    cpu: [
      { name: 'IME', text: cpu?.ime ? 'on' : 'off', parts: [12] },
      { name: 'HALT', text: cpu?.halted ? 'on' : 'off', parts: [13] },
    ],
  };
}

/** CPU registers, flags, IME and HALT of the running game (US2); read-only. */
export function RegistersView({ context, state, setState }: ViewInstanceProps<RegistersViewState>) {
  const { snapshot, session } = useInspection(context, state.rate);
  const changed = useChanges(snapshot?.frame ?? null, 'registers', snapshot ? values(snapshot) : null);

  const row = (field: Field) => {
    const isChanged = field.parts.some((part) => changed.has(part));
    return (
      <div key={field.name} className={styles.row}>
        <dt className={styles.name}>{field.name}</dt>
        <dd data-testid={`reg-${field.name}`} data-changed={isChanged} className={`${common.mono} ${styles.value} ${isChanged ? common.changed : ''}`}>
          {field.text}
        </dd>
      </div>
    );
  };

  if (session.rom === null || !snapshot) {
    return (
      <div className={styles.registers}>
        <InspectNotice romLoaded={session.rom !== null} />
        <RateBar rate={state.rate} onChange={(rate) => { setState({ rate }); }} />
      </div>
    );
  }

  const groups = fields(snapshot);
  const flags = snapshot.flags;
  return (
    <div className={styles.registers} data-frame={snapshot.frame}>
      <dl className={styles.grid}>{groups.registers.map(row)}</dl>
      <dl className={styles.grid}>{groups.pairs.map(row)}</dl>
      <div className={styles.flags} role="group" aria-label="Flags">
        {(['Z', 'N', 'H', 'C'] as const).map((flag) => {
          const set = flags[flag.toLowerCase() as 'z' | 'n' | 'h' | 'c'];
          return (
            <span key={flag} data-testid={`flag-${flag}`} aria-label={`${flag} ${set ? 'set' : 'clear'}`} className={`${common.mono} ${styles.flag}`}>
              {flag} {set ? '●' : '○'}
            </span>
          );
        })}
      </div>
      <dl className={styles.grid}>{groups.cpu.map(row)}</dl>
      <RateBar rate={state.rate} onChange={(rate) => { setState({ rate }); }} />
    </div>
  );
}
