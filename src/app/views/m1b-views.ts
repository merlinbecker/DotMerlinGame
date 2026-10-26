import { hexDefinition } from '../../views/hex/definition.ts';
import { HexView } from '../../views/hex/HexView.tsx';
import { defineView, type RegisteredView } from './registry.ts';

/** Read-only memory views of M1b (specs/004-m1b-memory-views); cycle order: VIEW_CYCLE_ORDER. */
export const M1B_VIEWS: readonly RegisteredView[] = [defineView(hexDefinition, HexView)];
