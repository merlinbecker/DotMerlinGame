import type { Button } from '../../core/index.ts';

/**
 * Combines several input sources (keyboard, gamepad): a button is down while any source holds it, so
 * releasing it on one source does not cut off another.
 */
export function createInputMux(send: (button: Button, pressed: boolean) => void) {
  const holders = new Map<Button, Set<string>>();
  return (source: string) => (button: Button, pressed: boolean) => {
    const set = holders.get(button) ?? new Set<string>();
    holders.set(button, set);
    const before = set.size > 0;
    if (pressed) set.add(source);
    else set.delete(source);
    const after = set.size > 0;
    if (before !== after) send(button, after);
  };
}
