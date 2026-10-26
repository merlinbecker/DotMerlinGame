import { hexDefinition } from '../../views/hex/definition.ts';
import { HexView } from '../../views/hex/HexView.tsx';
import { registersDefinition } from '../../views/registers/definition.ts';
import { RegistersView } from '../../views/registers/RegistersView.tsx';
import { tilemapsDefinition } from '../../views/tilemaps/definition.ts';
import { TilemapsView } from '../../views/tilemaps/TilemapsView.tsx';
import { tilesDefinition } from '../../views/tiles/definition.ts';
import { TilesView } from '../../views/tiles/TilesView.tsx';
import { defineView, type RegisteredView } from './registry.ts';

/** Read-only memory views of M1b (specs/004-m1b-memory-views); cycle order: VIEW_CYCLE_ORDER. */
export const M1B_VIEWS: readonly RegisteredView[] = [defineView(hexDefinition, HexView), defineView(registersDefinition, RegistersView), defineView(tilesDefinition, TilesView), defineView(tilemapsDefinition, TilemapsView)];
