import { describe, expect, it, vi } from 'vitest';
import type { Button } from '../../src/core/index.ts';
import { attachGamepads, padButtons, type GamepadEnvironment } from '../../src/adapters/input/gamepad.ts';
import { createInputMux } from '../../src/adapters/input/input-mux.ts';
import { attachKeyboard, KEY_MAP } from '../../src/adapters/input/keyboard.ts';

function keyTarget() {
  const target = new EventTarget();
  const presses: [Button, boolean][] = [];
  const detach = attachKeyboard(target as unknown as Window, (button, pressed) => presses.push([button, pressed]));
  const key = (type: 'keydown' | 'keyup', code: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent(type, { code, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };
  return { target, presses, detach, key };
}

describe('keyboard (FR-006)', () => {
  it('maps WASD, J, K, Enter and Space', () => {
    expect(KEY_MAP).toEqual({ KeyW: 'Up', KeyA: 'Left', KeyS: 'Down', KeyD: 'Right', KeyJ: 'A', KeyK: 'B', Enter: 'Start', Space: 'Select' });
  });

  it('leaves every key to a text field, so nothing is lost while typing', () => {
    const { presses, target } = keyTarget();
    const input = document.createElement('input');
    target.addEventListener('keydown', () => undefined);
    const event = new KeyboardEvent('keydown', { code: 'KeyS', cancelable: true, bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(presses).toEqual([]);
  });

  it('still releases a key that was held when the focus moved to a text field', () => {
    const { presses, target, key } = keyTarget();
    key('keydown', 'KeyS');
    const event = new KeyboardEvent('keyup', { code: 'KeyS', cancelable: true });
    Object.defineProperty(event, 'target', { value: document.createElement('textarea') });
    target.dispatchEvent(event);
    expect(presses).toEqual([['Down', true], ['Down', false]]);
  });

  it('presses and releases, ignores key repeat, prevents default (no scrolling with Space)', () => {
    const { presses, key } = keyTarget();
    const down = key('keydown', 'Space');
    key('keydown', 'Space', { repeat: true });
    key('keyup', 'Space');
    key('keydown', 'KeyJ');
    expect(down.defaultPrevented).toBe(true);
    expect(presses).toEqual([
      ['Select', true],
      ['Select', false],
      ['A', true],
    ]);
  });

  it('ignores unmapped keys such as the arrows', () => {
    const { presses, key } = keyTarget();
    key('keydown', 'ArrowUp');
    expect(presses).toEqual([]);
  });

  it('releases held keys when the window loses focus', () => {
    const { target, presses, key } = keyTarget();
    key('keydown', 'KeyD');
    target.dispatchEvent(new Event('blur'));
    expect(presses).toEqual([
      ['Right', true],
      ['Right', false],
    ]);
  });
});

const pad = (pressed: number[], axes: number[] = [0, 0]) => ({
  id: 'Test Pad',
  connected: true,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  axes,
});

describe('gamepad (FR-006)', () => {
  it('uses the standard mapping placed like the DMG', () => {
    expect([...padButtons(pad([1, 0, 8, 9]))].sort()).toEqual(['A', 'B', 'Select', 'Start']);
    expect([...padButtons(pad([12, 15]))].sort()).toEqual(['Right', 'Up']);
  });

  it('treats the left stick like the d-pad', () => {
    expect([...padButtons(pad([], [-0.9, 0.8]))].sort()).toEqual(['Down', 'Left']);
    expect([...padButtons(pad([], [0.3, -0.3]))]).toEqual([]);
  });

  it('polls connected pads every frame and reports changes only', () => {
    let current = [pad([])];
    let frame: (() => void) | null = null;
    const listeners = new Map<string, () => void>();
    const env: GamepadEnvironment = {
      getGamepads: () => current as unknown as Gamepad[],
      addEventListener: (type, l) => listeners.set(type, l),
      removeEventListener: (type) => listeners.delete(type),
      requestAnimationFrame: (cb) => {
        frame = cb;
        return 1;
      },
      cancelAnimationFrame: () => {
        frame = null;
      },
    };
    const presses: [Button, boolean][] = [];
    const names = vi.fn();
    attachGamepads(env, (b, p) => presses.push([b, p]), names);
    expect(names).toHaveBeenLastCalledWith(['Test Pad']);
    const tick = () => (frame)?.();
    current = [pad([1])];
    tick();
    tick();
    current = [pad([])];
    tick();
    expect(presses).toEqual([
      ['A', true],
      ['A', false],
    ]);
    current = [];
    listeners.get('gamepaddisconnected')?.();
    expect(names).toHaveBeenLastCalledWith([]);
    expect(frame).toBeNull();
  });
});

describe('input mux', () => {
  it('keeps a button down while another source still holds it', () => {
    const sent: [Button, boolean][] = [];
    const mux = createInputMux((b, p) => sent.push([b, p]));
    const keyboard = mux('keyboard');
    const gamepad = mux('gamepad');
    keyboard('A', true);
    gamepad('A', true);
    keyboard('A', false);
    expect(sent).toEqual([['A', true]]);
    gamepad('A', false);
    expect(sent).toEqual([
      ['A', true],
      ['A', false],
    ]);
  });
});
