import { controllerDefinition } from '../../views/controller/definition.ts';
import { ControllerView } from '../../views/controller/ControllerView.tsx';
import { romInfoDefinition } from '../../views/rom-info/definition.ts';
import { RomInfoView } from '../../views/rom-info/RomInfoView.tsx';
import { screenDefinition } from '../../views/screen/definition.ts';
import { ScreenView } from '../../views/screen/ScreenView.tsx';
import { defineView, type RegisteredView } from './registry.ts';

/** All views of M1. */
export const M1_VIEWS: readonly RegisteredView[] = [
  defineView(screenDefinition, ScreenView),
  defineView(controllerDefinition, ControllerView),
  defineView(romInfoDefinition, RomInfoView),
];
