import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { parsePage } from '../inspect-common/parse-page.ts';

export interface BuildViewState {
  readonly page: number;
}

export const INITIAL_BUILD_STATE: BuildViewState = { page: 0 };

export const buildDefinition: ViewDefinition<BuildViewState> = {
  typeId: 'build',
  title: 'Build',
  icon: 'build',
  initialState: INITIAL_BUILD_STATE,
  serialize: (state) => ({ page: state.page }),
  deserialize: (json: JsonValue) => ({ page: parsePage(json) }),
  headerActions: () => [{ id: 'build', label: 'Build', action: { type: 'Build' } }],
};
