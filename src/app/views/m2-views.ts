import { SourceEditor } from '../../adapters/editor/SourceEditor.tsx';
import { BuildView } from '../../views/build/BuildView.tsx';
import { buildDefinition } from '../../views/build/definition.ts';
import { editorDefinition } from '../../views/editor/definition.ts';
import { createEditorView } from '../../views/editor/EditorView.tsx';
import { projectDefinition } from '../../views/project/definition.ts';
import { ProjectView } from '../../views/project/ProjectView.tsx';
import { defineView, type RegisteredView } from './registry.ts';

/** Views of M2 (specs/002-m2-assembler-editor-export); cycle order: VIEW_CYCLE_ORDER. */
export const M2_VIEWS: readonly RegisteredView[] = [
  defineView(editorDefinition, createEditorView(SourceEditor)),
  defineView(buildDefinition, BuildView),
  defineView(projectDefinition, ProjectView),
];
