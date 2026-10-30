import type { JsonValue, ViewDefinition } from '../../core/index.ts';
import { parsePage } from '../inspect-common/parse-page.ts';

export interface EditorViewState {
  readonly page: number;
}

export const INITIAL_EDITOR_STATE: EditorViewState = { page: 0 };

export const editorDefinition: ViewDefinition<EditorViewState> = {
  typeId: 'editor',
  title: 'Editor',
  icon: 'editor',
  initialState: INITIAL_EDITOR_STATE,
  serialize: (state) => ({ page: state.page }),
  deserialize: (json: JsonValue) => ({ page: parsePage(json) }),
  headerActions: () => [{ id: 'build', label: 'Build', action: { type: 'Build' } }],
};
