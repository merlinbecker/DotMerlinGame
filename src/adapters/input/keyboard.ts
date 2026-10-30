import type { Button } from '../../core/index.ts';

/** Keyboard map (FR-006): physical key codes, so the layout does not matter. */
export const KEY_MAP: Readonly<Record<string, Button>> = {
  KeyW: 'Up',
  KeyA: 'Left',
  KeyS: 'Down',
  KeyD: 'Right',
  KeyJ: 'A',
  KeyK: 'B',
  Enter: 'Start',
  Space: 'Select',
};

/** Keys that also operate a focused button; they stay with the UI while a control has focus. */
const UI_KEYS = new Set(['Enter', 'Space']);

interface KeyboardTarget {
  addEventListener(type: 'keydown' | 'keyup', listener: (event: KeyboardEvent) => void): void;
  addEventListener(type: 'blur', listener: () => void): void;
  removeEventListener(type: 'keydown' | 'keyup', listener: (event: KeyboardEvent) => void): void;
  removeEventListener(type: 'blur', listener: () => void): void;
}

function isControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(target.tagName));
}

/** Typing belongs to the text field, every key of it (M2 editor, jump input of the Hex view). */
function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName));
}

/** Plays with the keyboard whether or not the controller view is shown. Returns detach. */
export function attachKeyboard(target: KeyboardTarget, press: (button: Button, pressed: boolean) => void): () => void {
  const held = new Set<Button>();
  const onKey = (event: KeyboardEvent) => {
    const button = KEY_MAP[event.code];
    if (!button) return;
    if (UI_KEYS.has(event.code) && isControl(event.target)) return;
    // A key held before the focus moved to a text field must still be released.
    if (isTextEntry(event.target) && !(event.type === 'keyup' && held.has(button))) return;
    event.preventDefault();
    const pressed = event.type === 'keydown';
    if (pressed === held.has(button)) return; // key repeat, or release of a key pressed elsewhere
    if (pressed) held.add(button);
    else held.delete(button);
    press(button, pressed);
  };
  const releaseAll = () => {
    for (const button of held) press(button, false);
    held.clear();
  };
  target.addEventListener('keydown', onKey);
  target.addEventListener('keyup', onKey);
  target.addEventListener('blur', releaseAll);
  return () => {
    releaseAll();
    target.removeEventListener('keydown', onKey);
    target.removeEventListener('keyup', onKey);
    target.removeEventListener('blur', releaseAll);
  };
}
