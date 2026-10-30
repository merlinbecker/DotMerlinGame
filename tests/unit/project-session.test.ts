import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DELAY_MS, createProjectSession, type ExampleProject, type ProjectSessionDeps } from '../../src/app/session/project-session.ts';
import {
  ArchiveRejectedError,
  decodeSource,
  defaultSettings,
  encodeSource,
  StorageFullError,
  type BuildResult,
  type DomainEvent,
  type Project,
  type ProjectStorePort,
} from '../../src/core/index.ts';

const example: ExampleProject = { exampleId: 'hello', name: 'hello', settings: defaultSettings('hello'), files: [{ path: 'main.asm', content: encodeSource('nop') }] };
const OK: BuildResult = { success: true, rom: new Uint8Array([1, 2]), symbols: 's', map: 'm', diagnostics: [], durationMs: 5 };

function memoryStore(): ProjectStorePort & { saved: Project[]; map: Map<string, Project> } {
  const map = new Map<string, Project>();
  const saved: Project[] = [];
  const saves = new Map<string, Uint8Array>();
  return {
    saved,
    map,
    loadSaveData: (id) => Promise.resolve(saves.get(id) ?? null),
    saveSaveData: (id, data) => {
      saves.set(id, data);
      return Promise.resolve();
    },
    list: () => Promise.resolve([...map.values()].reverse().map(({ id, name }) => ({ id, name, updatedAt: '' }))),
    load: (id) => Promise.resolve(map.get(id)),
    save: (project) => {
      saved.push(project);
      map.set(project.id, project);
      return Promise.resolve();
    },
    remove: (id) => {
      map.delete(id);
      return Promise.resolve();
    },
  };
}

function setup(overrides: Partial<ProjectSessionDeps> = {}) {
  const store = memoryStore();
  const events: DomainEvent[] = [];
  const runRom = vi.fn<ProjectSessionDeps['runRom']>(() => Promise.resolve());
  const save = vi.fn();
  let id = 0;
  const importProject = vi.fn<(zip: Uint8Array) => Promise<Project>>();
  const build = vi.fn<() => Promise<BuildResult>>(() => Promise.resolve(OK));
  const session = createProjectSession({
    store,
    assembler: { prepare: () => Promise.resolve(), build },
    archive: { exportProject: () => Promise.resolve(new Uint8Array([9])), importProject },
    files: { save },
    examples: [example],
    runRom,
    publish: (event) => events.push(event),
    createId: () => `p${String(++id)}`,
    pause: () => Promise.resolve(),
    ...overrides,
  });
  const state = () => session.state.getSnapshot();
  const fromExample = async () => {
    session.dispatch({ type: 'NewProjectFromExample', exampleId: 'hello' });
    await session.idle();
  };
  return { session, store, events, runRom, save, build, importProject, state, fromExample };
}

const text = (project: Project | null, path = 'main.asm') => {
  const file = project?.files.find((f) => f.path === path);
  return file ? decodeSource(file) : null;
};

describe('project session', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a stored project from an example and offers the examples', async () => {
    const t = setup();
    expect(t.state().examples).toEqual([{ id: 'hello', name: 'hello' }]);
    await t.fromExample();
    expect(t.state().project?.id).toBe('p1');
    expect(t.state().activeFile).toBe('main.asm');
    expect(t.store.map.has('p1')).toBe(true);
    expect(t.events).toContainEqual({ type: 'ProjectChanged', projectId: 'p1' });
  });

  it('gives a second project from the same example a unique name and id', async () => {
    const t = setup();
    await t.fromExample();
    await t.fromExample();
    expect(t.state().project).toMatchObject({ id: 'p2', name: 'hello 2' });
  });

  it('keeps an edit in the state at once and saves it after the delay', async () => {
    const t = setup();
    await t.fromExample();
    const before = t.store.saved.length;
    const events = t.events.length;
    t.session.dispatch({ type: 'EditFile', path: 'main.asm', text: 'halt' });
    expect(text(t.state().project)).toBe('halt');
    expect(t.state().saveState).toBe('pending');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
    expect(t.store.saved).toHaveLength(before);
    await vi.advanceTimersByTimeAsync(1);
    await t.session.idle();
    expect(text(t.store.saved.at(-1) ?? null)).toBe('halt');
    expect(t.state().saveState).toBe('saved');
    expect(t.events).toHaveLength(events); // no ProjectChanged per keystroke
  });

  it('saves at once when the page is hidden', async () => {
    const listeners = new Map<string, () => void>();
    const page = {
      visibilityState: 'visible' as DocumentVisibilityState,
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
      removeEventListener: () => undefined,
    };
    const t = setup({ page });
    await t.fromExample();
    t.session.dispatch({ type: 'EditFile', path: 'main.asm', text: 'halt' });
    page.visibilityState = 'hidden';
    listeners.get('visibilitychange')?.();
    await t.session.idle();
    expect(text(t.store.saved.at(-1) ?? null)).toBe('halt');
  });

  it('keeps the text and reports it when the storage is full', async () => {
    const t = setup();
    await t.fromExample();
    t.store.save = () => Promise.reject(new StorageFullError());
    t.session.dispatch({ type: 'EditFile', path: 'main.asm', text: 'halt' });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    await t.session.idle();
    expect(t.state().saveState).toBe('failed');
    expect(t.state().notice).toEqual({ kind: 'storage-full' });
    expect(text(t.state().project)).toBe('halt');
    expect(t.events).toContainEqual({ type: 'StorageFailed', operation: 'save-project' });
  });

  it('builds, reports and runs the ROM (US1-AS1)', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'Build' });
    await t.session.idle();
    expect(t.state().build).toEqual({ status: 'finished', result: OK });
    expect(t.events).toContainEqual({ type: 'BuildFinished', success: true, errorCount: 0, warningCount: 0 });
    expect(t.runRom).toHaveBeenCalledWith(OK.rom, 'hello.gb', null, expect.any(Function));
  });

  it('runs nothing after a failed build and counts its messages', async () => {
    const failed: BuildResult = {
      success: false,
      durationMs: 1,
      diagnostics: [
        { file: 'main.asm', line: 1, severity: 'error', message: 'x', tool: 'rgbasm' },
        { file: 'main.asm', line: 2, severity: 'warning', message: 'y', tool: 'rgbasm' },
      ],
    };
    const t = setup();
    t.build.mockResolvedValue(failed);
    await t.fromExample();
    t.session.dispatch({ type: 'Build' });
    await t.session.idle();
    expect(t.state().build.status).toBe('failed');
    expect(t.events).toContainEqual({ type: 'BuildFinished', success: false, errorCount: 1, warningCount: 1 });
    expect(t.runRom).not.toHaveBeenCalled();
  });

  it('reports a timeout', async () => {
    const t = setup();
    t.build.mockResolvedValue({ success: false, timedOut: true, diagnostics: [], durationMs: 10 });
    await t.fromExample();
    t.session.dispatch({ type: 'Build' });
    await t.session.idle();
    expect(t.state().build.status).toBe('timed-out');
  });

  it('marks the result stale after an edit, also an edit during the build', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'Build' });
    await t.session.idle();
    expect(t.state().buildIsStale).toBe(false);
    t.session.dispatch({ type: 'EditFile', path: 'main.asm', text: 'halt' });
    expect(t.state().buildIsStale).toBe(true);

    let finish: (r: BuildResult) => void = () => undefined;
    t.build.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    t.session.dispatch({ type: 'Build' });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.state().build.status).toBe('running');
    t.session.dispatch({ type: 'EditFile', path: 'main.asm', text: 'nop' });
    finish(OK);
    await t.session.idle();
    expect(t.state().buildIsStale).toBe(true);
  });

  it('moves the cursor to a message, again on a second tap', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'GoToDiagnostic', file: 'main.asm', line: 7 });
    await t.session.idle();
    const first = t.state().cursorTarget;
    expect(first).toMatchObject({ file: 'main.asm', line: 7 });
    t.session.dispatch({ type: 'GoToDiagnostic', file: 'main.asm', line: 7 });
    await t.session.idle();
    expect(t.state().cursorTarget?.sequence).not.toBe(first?.sequence);
  });

  it('exports only a successful build (US2-AS3)', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'ExportRom' });
    await t.session.idle();
    expect(t.save).not.toHaveBeenCalled();
    t.session.dispatch({ type: 'Build' });
    t.session.dispatch({ type: 'ExportRom' });
    await t.session.idle();
    expect(t.save).toHaveBeenCalledWith('hello.gb', OK.rom, 'application/octet-stream');
  });

  it('leaves all projects unchanged when an archive is rejected (US3-AS3)', async () => {
    const t = setup();
    await t.fromExample();
    const before = [...t.store.saved];
    t.importProject.mockRejectedValue(new ArchiveRejectedError('unsafe-path'));
    t.session.dispatch({ type: 'ImportZip', bytes: new Uint8Array() });
    await t.session.idle();
    expect(t.state().notice).toEqual({ kind: 'import-rejected', reason: 'unsafe-path' });
    expect(t.store.saved).toEqual(before);
  });

  it('asks on a name conflict; replace keeps the id, copy gets its own (US3-AS4)', async () => {
    const t = setup();
    await t.fromExample();
    const incoming: Project = { id: 'zip', name: 'hello', settings: example.settings, files: [{ path: 'main.asm', content: encodeSource('new') }] };
    t.importProject.mockResolvedValue(incoming);
    const saves = t.store.saved.length;

    t.session.dispatch({ type: 'ImportZip', bytes: new Uint8Array() });
    await t.session.idle();
    expect(t.state().importConflict).toBe('hello');
    expect(t.store.saved).toHaveLength(saves); // nothing written before the answer

    t.session.dispatch({ type: 'ResolveImport', choice: 'cancel' });
    await t.session.idle();
    expect(t.state().importConflict).toBeNull();
    expect(t.store.saved).toHaveLength(saves);

    t.session.dispatch({ type: 'ImportZip', bytes: new Uint8Array() });
    t.session.dispatch({ type: 'ResolveImport', choice: 'replace' });
    await t.session.idle();
    expect(t.state().project?.id).toBe('p1');
    expect(text(t.state().project)).toBe('new');

    t.session.dispatch({ type: 'ImportZip', bytes: new Uint8Array() });
    t.session.dispatch({ type: 'ResolveImport', choice: 'copy' });
    await t.session.idle();
    expect(t.state().project).toMatchObject({ id: 'zip', name: 'hello copy' });
  });

  it('keeps save data per project and hands it to the next run', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'Build' });
    await t.session.idle();
    const saveData = t.runRom.mock.calls[0]?.[3] as (d: Uint8Array) => Promise<void>;
    await saveData(new Uint8Array([5]));
    t.session.dispatch({ type: 'RunBuild' });
    await t.session.idle();
    expect(t.runRom.mock.calls[1]?.[2]).toEqual(new Uint8Array([5]));
  });

  it('creates, renames and deletes files, and saves them', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'CreateFile', path: 'inc/a.inc' });
    await t.session.idle();
    expect(t.state().activeFile).toBe('inc/a.inc');
    expect(t.state().saveState).toBe('pending');
    t.session.dispatch({ type: 'RenameFile', from: 'inc/a.inc', to: 'b.inc' });
    await t.session.idle();
    expect(t.state().activeFile).toBe('b.inc');
    t.session.dispatch({ type: 'DeleteFile', path: 'b.inc' });
    await t.session.idle();
    expect(t.state().activeFile).toBe('main.asm');
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    await t.session.idle();
    expect(t.store.map.get('p1')?.files.map((f) => f.path)).toEqual(['main.asm']);
  });

  it('reports a refused file change and changes nothing', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'CreateFile', path: '../x' });
    t.session.dispatch({ type: 'DeleteFile', path: 'main.asm' });
    await t.session.idle();
    expect(t.state().notice).toEqual({ kind: 'file-rejected', reason: 'last-file' });
    expect(t.state().project?.files).toHaveLength(1);
  });

  it('changes valid settings and names, and refuses others', async () => {
    const t = setup();
    await t.fromExample();
    const settings = { ...example.settings, mbc: 'MBC5+RAM', ramSize: 2 };
    t.session.dispatch({ type: 'SetProjectSettings', settings });
    await t.session.idle();
    expect(t.state().project?.settings).toEqual(settings);
    t.session.dispatch({ type: 'SetProjectSettings', settings: { ...settings, mbc: 'BOGUS' } });
    await t.session.idle();
    expect(t.state().notice).toEqual({ kind: 'settings-rejected' });
    expect(t.state().project?.settings).toEqual(settings);
    t.session.dispatch({ type: 'RenameProject', name: 'better' });
    await t.session.idle();
    expect(t.state().project?.name).toBe('better');
    t.session.dispatch({ type: 'RenameProject', name: ' ' });
    await t.session.idle();
    expect(t.state().notice).toEqual({ kind: 'name-rejected' });
  });

  it('shows when an action fails unexpectedly instead of doing nothing', async () => {
    const t = setup();
    t.store.load = () => Promise.reject(new Error('closed'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    t.session.dispatch({ type: 'OpenProject', projectId: 'x' });
    await t.session.idle();
    expect(t.state().notice).toEqual({ kind: 'action-failed' });
    vi.restoreAllMocks();
  });

  describe('ROM import', () => {
    const rom = new Uint8Array(0x8000).fill(0x76);

    it('creates a project without the ROM, says whether the build matches, starts nothing (US1)', async () => {
      const t = setup();
      t.build.mockResolvedValue({ ...OK, rom });
      t.session.dispatch({ type: 'ImportRom', bytes: rom, fileName: 'game.gb' });
      await t.session.idle();
      const project = t.state().project;
      expect(project).toMatchObject({ name: 'game', settings: { entry: 'main.asm', fixHeader: false } });
      expect(project?.files.map((f) => f.path)).toEqual(['main.asm', 'bank_000.asm', 'bank_001.asm']);
      expect(t.state().romImport).toEqual({ status: 'done', result: { verdict: 'identical', paddedBytes: 0 } });
      expect(t.events).toContainEqual({ type: 'ProjectChanged', projectId: 'p1' });
      expect(t.runRom).not.toHaveBeenCalled();
      expect(JSON.stringify(Object.keys(t.store.map.get('p1') ?? {}))).not.toContain('rom');
    });

    it('still keeps the project when the build differs or times out', async () => {
      const t = setup();
      t.build.mockResolvedValue({ ...OK, rom: new Uint8Array(0x8000) });
      t.session.dispatch({ type: 'ImportRom', bytes: rom, fileName: 'a.gb' });
      await t.session.idle();
      expect(t.state().romImport).toEqual({ status: 'done', result: { verdict: 'different', paddedBytes: 0 } });
      t.build.mockResolvedValue({ success: false, timedOut: true, diagnostics: [], durationMs: 1 });
      t.session.dispatch({ type: 'ImportRom', bytes: rom, fileName: 'a.gb' });
      await t.session.idle();
      expect(t.state().romImport).toEqual({ status: 'done', result: { verdict: 'not-verified', paddedBytes: 0 } });
      expect(t.state().project?.name).toBe('a 2');
    });

    it('refuses an empty file', async () => {
      const t = setup();
      t.session.dispatch({ type: 'ImportRom', bytes: new Uint8Array(), fileName: 'a.gb' });
      await t.session.idle();
      expect(t.state().notice).toEqual({ kind: 'empty-rom' });
      expect(t.store.saved).toEqual([]);
    });
  });

  it('closes a deleted open project', async () => {
    const t = setup();
    await t.fromExample();
    t.session.dispatch({ type: 'DeleteProject', projectId: 'p1' });
    await t.session.idle();
    expect(t.state().project).toBeNull();
    expect(t.store.map.size).toBe(0);
  });

  it('opens the most recent project on start (US3-AS1)', async () => {
    const t = setup();
    await t.fromExample();
    const again = setup({ store: t.store });
    await again.session.init();
    expect(again.state().project?.id).toBe('p1');
  });
});
