import { PROJECT_NAME } from '../../config/project.ts';
import type { Project, ProjectStorePort, ProjectSummary } from '../../core/index.ts';
import { openObjectStore, request } from './idb.ts';

export const PROJECT_DB_NAME = `${PROJECT_NAME.toLowerCase()}-projects`;
const STORE = 'projects';

interface StoredProject extends Project {
  readonly updatedAt: string;
}

/** Projects are the single source of truth (Constitution I); they stay on the device (Constitution IX). */
export function createIndexedDbProjectStore(databaseName = PROJECT_DB_NAME): ProjectStorePort {
  const access = openObjectStore(databaseName, STORE);

  return {
    async list() {
      const tx = await access.transaction('readonly');
      const all = (await request(tx.objectStore(STORE).getAll())) as StoredProject[];
      return all
        .map(({ id, name, updatedAt }): ProjectSummary => ({ id, name, updatedAt }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async load(id) {
      const tx = await access.transaction('readonly');
      const stored = (await request(tx.objectStore(STORE).get(id))) as StoredProject | undefined;
      if (!stored) return undefined;
      const { id: storedId, name, settings, files } = stored;
      return { id: storedId, name, settings, files };
    },
    async save(project) {
      const record: StoredProject = { ...project, updatedAt: new Date().toISOString() };
      await access.write((store) => store.put(record, project.id));
    },
    async remove(id) {
      await access.write((store) => store.delete(id));
    },
  };
}
