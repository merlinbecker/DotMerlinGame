import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { parsePage } from '../inspect-common/parse-page.ts';

export const PROJECT_TABS = ['projects', 'files', 'settings'] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export interface ProjectViewState {
  readonly page: number;
  readonly tab: ProjectTab;
}

export const INITIAL_PROJECT_STATE: ProjectViewState = { page: 0, tab: 'projects' };

export const projectDefinition: ViewDefinition<ProjectViewState> = {
  typeId: 'project',
  title: 'Project',
  icon: 'project',
  initialState: INITIAL_PROJECT_STATE,
  serialize: (state) => ({ page: state.page, tab: state.tab }),
  deserialize: (json: JsonValue) => {
    const tab = typeof json === 'object' && json !== null && !Array.isArray(json) ? (json as { readonly [key: string]: JsonValue }).tab : undefined;
    return { page: parsePage(json), tab: PROJECT_TABS.find((t) => t === tab) ?? 'projects' };
  },
};
