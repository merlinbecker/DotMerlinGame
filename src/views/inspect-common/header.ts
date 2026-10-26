import type { HeaderAction } from '../../core/index.ts';

/** "Refresh" in the slot header of every memory view: one current snapshot for this slot (FR-010). */
export function inspectHeaderActions(): readonly HeaderAction[] {
  return [{ id: 'refresh', label: 'Refresh', action: { type: 'RequestSnapshot' } }];
}
