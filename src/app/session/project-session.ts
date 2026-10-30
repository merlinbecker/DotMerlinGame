import {
  ArchiveRejectedError,
  encodeSource,
  IDLE_PROJECT_STATE,
  StorageFullError,
  type ArchivePort,
  type AssemblerPort,
  type DomainEvent,
  type FileSaverPort,
  type Project,
  type ProjectState,
  type ProjectStateSource,
  type ProjectStorePort,
  type ViewAction,
} from '../../core/index.ts';

/** Autosave this long after the last change (M2 research.md R9). */
export const AUTOSAVE_DELAY_MS = 1000;
const ROM_MIME = 'application/octet-stream';
const ZIP_MIME = 'application/zip';

export type ProjectAction = Extract<
  ViewAction,
  { type: 'NewProjectFromExample' | 'OpenProject' | 'DeleteProject' | 'OpenFile' | 'EditFile' | 'Build' | 'RunBuild' | 'ExportRom' | 'ExportZip' | 'ImportZip' | 'ResolveImport' | 'GoToDiagnostic' }
>;

const PROJECT_ACTIONS: ReadonlySet<ViewAction['type']> = new Set<ProjectAction['type']>([
  'NewProjectFromExample', 'OpenProject', 'DeleteProject', 'OpenFile', 'EditFile', 'Build', 'RunBuild', 'ExportRom', 'ExportZip', 'ImportZip', 'ResolveImport', 'GoToDiagnostic',
]);

export function isProjectAction(action: ViewAction): action is ProjectAction {
  return PROJECT_ACTIONS.has(action.type);
}

export type ExampleProject = Omit<Project, 'id'> & { readonly exampleId: string };

interface Page {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange' | 'pagehide', listener: () => void): void;
  removeEventListener(type: 'visibilitychange' | 'pagehide', listener: () => void): void;
}

export interface ProjectSessionDeps {
  readonly store: ProjectStorePort;
  readonly assembler: AssemblerPort;
  readonly archive: ArchivePort;
  readonly files: FileSaverPort;
  readonly examples: readonly ExampleProject[];
  /** Starts a built ROM in the emulator. */
  readonly runRom: (bytes: Uint8Array, fileName: string) => Promise<void>;
  readonly publish: (event: DomainEvent) => void;
  readonly page?: Page | null;
  readonly createId?: () => string;
}

export interface ProjectSession {
  readonly state: ProjectStateSource;
  dispatch(action: ProjectAction): void;
  /** Opens the most recently changed project. */
  init(): Promise<void>;
  /** Resolves when all actions are processed (tests). */
  idle(): Promise<void>;
  dispose(): void;
}

/** Owns the open project; the source of every build (Constitution I). Framework-free. */
export function createProjectSession(deps: ProjectSessionDeps): ProjectSession {
  const { store, assembler, archive, files, page = null } = deps;
  const createId = deps.createId ?? (() => crypto.randomUUID());
  const listeners = new Set<() => void>();
  let state: ProjectState = { ...IDLE_PROJECT_STATE, examples: deps.examples.map((e) => ({ id: e.exampleId, name: e.name })) };
  let queue: Promise<void> = Promise.resolve();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let saving: Promise<void> = Promise.resolve();
  let pendingImport: Project | null = null;
  let cursorSequence = 0;

  const update = (patch: Partial<ProjectState>) => {
    state = { ...state, ...patch };
    for (const listener of [...listeners]) listener();
  };

  const refreshList = async () => {
    update({ projects: await store.list() });
  };

  const saveNow = async (): Promise<void> => {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = null;
    const project = state.project;
    if (!project || state.saveState !== 'pending') return;
    const write = saving.then(async () => {
      try {
        await store.save(project);
        // Newer edits stay pending; their own timer saves them.
        if (state.project === project) update({ saveState: 'saved', notice: state.notice?.kind === 'storage-full' ? null : state.notice });
        await refreshList();
      } catch (error) {
        if (!(error instanceof StorageFullError)) throw error;
        // The text stays in memory: no data is lost in the editor (spec edge case).
        deps.publish({ type: 'StorageFailed', operation: 'save-project' });
        update({ saveState: 'failed', notice: { kind: 'storage-full' } });
      }
    });
    saving = write.catch((error: unknown) => {
      console.error('Could not save the project', error);
    });
    await saving;
  };

  const open = (project: Project) => {
    update({
      project,
      activeFile: project.settings.entry,
      cursorTarget: null,
      saveState: 'saved',
      build: { status: 'idle' },
      buildIsStale: false,
      notice: null,
    });
    deps.publish({ type: 'ProjectChanged', projectId: project.id });
  };

  const uniqueName = (name: string, ignoreId?: string): string => {
    const taken = new Set(state.projects.filter((p) => p.id !== ignoreId).map((p) => p.name));
    if (!taken.has(name)) return name;
    for (let n = 2; ; n++) {
      const candidate = `${name} ${String(n)}`;
      if (!taken.has(candidate)) return candidate;
    }
  };

  const persistAndOpen = async (project: Project) => {
    try {
      await store.save(project);
    } catch (error) {
      if (!(error instanceof StorageFullError)) throw error;
      deps.publish({ type: 'StorageFailed', operation: 'save-project' });
      update({ notice: { kind: 'storage-full' } });
      return;
    }
    await refreshList();
    open(project);
  };

  const build = async () => {
    const project = state.project;
    if (!project || state.build.status === 'running') return;
    const built = project;
    update({ build: { status: 'running' } });
    const result = await assembler.build(built.files, built.settings);
    const status = result.timedOut ? 'timed-out' : result.success ? 'finished' : 'failed';
    update({ build: { status, result }, buildIsStale: state.project !== built });
    const count = (severity: 'error' | 'warning') => result.diagnostics.filter((d) => d.severity === severity).length;
    deps.publish({ type: 'BuildFinished', success: result.success, errorCount: count('error'), warningCount: count('warning') });
    if (result.rom) await deps.runRom(result.rom, `${built.name}.gb`);
  };

  const successfulRom = () => (state.build.status === 'finished' ? state.build.result.rom : undefined);

  const importZip = async (bytes: Uint8Array) => {
    try {
      const imported = await archive.importProject(bytes);
      update({ notice: null });
      await refreshList();
      if (state.projects.some((p) => p.name === imported.name)) {
        pendingImport = imported;
        update({ importConflict: imported.name });
        return;
      }
      await persistAndOpen(imported);
    } catch (error) {
      if (!(error instanceof ArchiveRejectedError)) throw error;
      update({ notice: { kind: 'import-rejected', reason: error.reason } });
    }
  };

  const resolveImport = async (choice: 'replace' | 'copy' | 'cancel') => {
    const imported = pendingImport;
    pendingImport = null;
    update({ importConflict: null });
    if (!imported || choice === 'cancel') return;
    if (choice === 'copy') {
      await persistAndOpen({ ...imported, name: uniqueName(`${imported.name} copy`) });
      return;
    }
    const existing = state.projects.find((p) => p.name === imported.name);
    await persistAndOpen({ ...imported, id: existing?.id ?? imported.id });
  };

  const handle = async (action: ProjectAction): Promise<void> => {
    switch (action.type) {
      case 'NewProjectFromExample': {
        const example = deps.examples.find((e) => e.exampleId === action.exampleId);
        if (!example) return;
        await saveNow();
        await refreshList();
        await persistAndOpen({ id: createId(), name: uniqueName(example.name), settings: example.settings, files: example.files });
        return;
      }
      case 'OpenProject': {
        await saveNow();
        const project = await store.load(action.projectId);
        if (project) open(project);
        return;
      }
      case 'DeleteProject': {
        if (state.project?.id === action.projectId) {
          if (saveTimer !== null) clearTimeout(saveTimer);
          saveTimer = null;
          update({ ...IDLE_PROJECT_STATE, examples: state.examples, projects: state.projects });
        }
        await store.remove(action.projectId);
        await refreshList();
        return;
      }
      case 'OpenFile':
        if (state.project?.files.some((file) => file.path === action.path)) update({ activeFile: action.path });
        return;
      case 'Build':
        return build();
      case 'RunBuild': {
        const rom = successfulRom();
        if (rom && state.project) await deps.runRom(rom, `${state.project.name}.gb`);
        return;
      }
      case 'ExportRom': {
        const rom = successfulRom();
        if (rom && state.project) files.save(`${state.project.name}.gb`, rom, ROM_MIME);
        return;
      }
      case 'ExportZip':
        if (state.project) {
          await saveNow();
          files.save(`${state.project.name}.zip`, await archive.exportProject(state.project), ZIP_MIME);
        }
        return;
      case 'ImportZip':
        return importZip(action.bytes);
      case 'ResolveImport':
        return resolveImport(action.choice);
      case 'GoToDiagnostic':
        if (state.project?.files.some((file) => file.path === action.file)) {
          cursorSequence++;
          update({ activeFile: action.file, cursorTarget: { file: action.file, line: action.line, sequence: cursorSequence } });
        }
        return;
      case 'EditFile':
        return; // handled synchronously in dispatch
    }
  };

  /** Keeps the text in the state at once, so it survives a view switch (M2 spec edge case). */
  const edit = (path: string, text: string) => {
    const project = state.project;
    if (!project) return;
    update({
      project: { ...project, files: project.files.map((file) => (file.path === path ? { path, content: encodeSource(text) } : file)) },
      saveState: 'pending',
      buildIsStale: state.build.status !== 'idle',
    });
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveNow();
    }, AUTOSAVE_DELAY_MS);
  };

  const onVisibility = () => {
    if (page?.visibilityState === 'hidden') void saveNow();
  };
  const onPageHide = () => {
    void saveNow();
  };
  page?.addEventListener('visibilitychange', onVisibility);
  page?.addEventListener('pagehide', onPageHide);

  return {
    state: {
      subscribe(onChange) {
        listeners.add(onChange);
        return () => {
          listeners.delete(onChange);
        };
      },
      getSnapshot: () => state,
    },
    dispatch(action) {
      if (action.type === 'EditFile') {
        edit(action.path, action.text);
        return;
      }
      queue = queue
        .then(() => handle(action))
        .catch((error: unknown) => {
          console.error(`Action ${action.type} failed`, error);
        });
    },
    async init() {
      await refreshList();
      const latest = state.projects[0];
      const project = latest && (await store.load(latest.id));
      if (project) open(project);
    },
    idle: async () => {
      await queue;
      await saving;
    },
    dispose() {
      if (saveTimer !== null) clearTimeout(saveTimer);
      page?.removeEventListener('visibilitychange', onVisibility);
      page?.removeEventListener('pagehide', onPageHide);
    },
  };
}
