import type { Button } from '../types.ts';

/** Everything a view may ask for; the only way a view changes state. */
export type ViewAction =
  | { readonly type: 'Pause' }
  | { readonly type: 'Resume' }
  | { readonly type: 'Reset' }
  | { readonly type: 'SetBreakpoint'; readonly address: number; readonly bank?: number }
  | { readonly type: 'ClearBreakpoint'; readonly address: number; readonly bank?: number }
  | { readonly type: 'ButtonDown'; readonly button: Button }
  | { readonly type: 'ButtonUp'; readonly button: Button };
