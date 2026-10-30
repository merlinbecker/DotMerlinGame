import { encodeSource, type ProjectSettings } from '../../core/index.ts';
import type { ExampleProject } from './project-session.ts';

const FILES = import.meta.glob<string>('/examples/*/*', { query: '?raw', import: 'default', eager: true });
const NOT_PROJECT_FILES = new Set(['project.json', 'LICENSE']);

/** The examples are part of the bundle, so they work offline (FR-010). */
export function loadExamples(files: Readonly<Record<string, string>> = FILES): readonly ExampleProject[] {
  const byId = new Map<string, [string, string][]>();
  for (const [path, content] of Object.entries(files)) {
    const [, , id = '', name = ''] = path.split('/');
    byId.set(id, [...(byId.get(id) ?? []), [name, content]]);
  }
  return [...byId.entries()].map(([exampleId, entries]) => {
    const meta = entries.find(([name]) => name === 'project.json')?.[1];
    if (meta === undefined) throw new Error(`Example ${exampleId} has no project.json`);
    const { name, settings } = JSON.parse(meta) as { name: string; settings: ProjectSettings };
    return {
      exampleId,
      name,
      settings,
      files: entries.filter(([path]) => !NOT_PROJECT_FILES.has(path)).map(([path, content]) => ({ path, content: encodeSource(content) })),
    };
  });
}
