import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { parsePage } from '../inspect-common/parse-page.ts';

export interface ProjectViewState {
  readonly page: number;
}

export const INITIAL_PROJECT_STATE: ProjectViewState = { page: 0 };

export const projectDefinition: ViewDefinition<ProjectViewState> = {
  typeId: 'project',
  title: 'Project',
  icon: 'project',
  initialState: INITIAL_PROJECT_STATE,
  serialize: (state) => ({ page: state.page }),
  deserialize: (json: JsonValue) => ({ page: parsePage(json) }),
};
