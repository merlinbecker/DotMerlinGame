import type { ViewDefinition } from '../../core/index.ts';

export const controllerDefinition: ViewDefinition<null> = {
  typeId: 'controller',
  title: 'Controller',
  icon: 'controller',
  initialState: null,
  serialize: () => null,
  deserialize: () => null,
};
