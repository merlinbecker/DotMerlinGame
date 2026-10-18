import type { Button } from '../../core/index.ts';

/** Standard Gamepad mapping (W3C Gamepad "standard" layout), placed like the DMG: right face = A. */
const BUTTON_INDEX: readonly (readonly [Button, number])[] = [
  ['A', 1],
  ['B', 0],
  ['Select', 8],
  ['Start', 9],
  ['Up', 12],
  ['Down', 13],
  ['Left', 14],
  ['Right', 15],
];
const STICK_THRESHOLD = 0.5;

export interface PadState {
  readonly buttons: readonly { readonly pressed: boolean }[];
  readonly axes: readonly number[];
}

/** Buttons held on one pad; the left stick acts like the d-pad. */
export function padButtons(pad: PadState): Set<Button> {
  const held = new Set<Button>();
  for (const [button, index] of BUTTON_INDEX) if (pad.buttons[index]?.pressed) held.add(button);
  const [x = 0, y = 0] = pad.axes;
  if (x <= -STICK_THRESHOLD) held.add('Left');
  if (x >= STICK_THRESHOLD) held.add('Right');
  if (y <= -STICK_THRESHOLD) held.add('Up');
  if (y >= STICK_THRESHOLD) held.add('Down');
  return held;
}

export interface GamepadEnvironment {
  getGamepads(): readonly (Gamepad | null)[];
  addEventListener(type: 'gamepadconnected' | 'gamepaddisconnected', listener: () => void): void;
  removeEventListener(type: 'gamepadconnected' | 'gamepaddisconnected', listener: () => void): void;
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(handle: number): void;
}

export function browserGamepads(): GamepadEnvironment {
  return {
    getGamepads: () => navigator.getGamepads(),
    addEventListener: (type, listener) => {
      window.addEventListener(type, listener);
    },
    removeEventListener: (type, listener) => {
      window.removeEventListener(type, listener);
    },
    requestAnimationFrame: (callback) => requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => {
      cancelAnimationFrame(handle);
    },
  };
}

/**
 * Game controllers via the Gamepad API (Bluetooth or USB). Chrome reports a pad only after its first
 * button press; from then on it is polled once per display frame. Returns detach.
 */
export function attachGamepads(
  env: GamepadEnvironment,
  press: (button: Button, pressed: boolean) => void,
  connected: (names: readonly string[]) => void,
): () => void {
  let held = new Set<Button>();
  let handle: number | null = null;

  const pads = () => env.getGamepads().filter((pad): pad is Gamepad => pad !== null && pad.connected);

  const poll = () => {
    const now = new Set<Button>();
    for (const pad of pads()) for (const button of padButtons(pad)) now.add(button);
    for (const button of now) if (!held.has(button)) press(button, true);
    for (const button of held) if (!now.has(button)) press(button, false);
    held = now;
    handle = env.requestAnimationFrame(poll);
  };

  const update = () => {
    const list = pads();
    connected(list.map((pad) => pad.id));
    if (list.length > 0 && handle === null) handle = env.requestAnimationFrame(poll);
    if (list.length === 0 && handle !== null) {
      env.cancelAnimationFrame(handle);
      handle = null;
      for (const button of held) press(button, false);
      held = new Set();
    }
  };

  env.addEventListener('gamepadconnected', update);
  env.addEventListener('gamepaddisconnected', update);
  update();
  return () => {
    env.removeEventListener('gamepadconnected', update);
    env.removeEventListener('gamepaddisconnected', update);
    if (handle !== null) env.cancelAnimationFrame(handle);
    for (const button of held) press(button, false);
  };
}
