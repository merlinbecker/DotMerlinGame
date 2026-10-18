import type { ViewDefinition } from '../../core/index.ts';

export const romInfoDefinition: ViewDefinition<null> = {
  typeId: 'rom-info',
  title: 'ROM Info',
  icon: 'rom',
  initialState: null,
  serialize: () => null,
  deserialize: () => null,
};
