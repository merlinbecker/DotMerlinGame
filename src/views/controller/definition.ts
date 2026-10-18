import type { Button, ViewDefinition } from '../../core/index.ts';

export const controllerDefinition: ViewDefinition<null> = {
  typeId: 'controller',
  title: 'Controller',
  icon: 'controller',
  initialState: null,
  serialize: () => null,
  deserialize: () => null,
};

/** Keyboard map (research.md R12). */
export const KEY_MAP: Readonly<Record<string, Button>> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  KeyX: 'A',
  KeyZ: 'B',
  Enter: 'Start',
  ShiftLeft: 'Select',
  ShiftRight: 'Select',
};
