import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createFflateArchive } from '../adapters/archive/fflate-archive.ts';
import { createRgbdsAssembler } from '../adapters/assembler/rgbds/rgbds-assembler.ts';
import { createWebAudioOutput } from '../adapters/audio/web-audio-output.ts';
import { createAnchorFileSaver } from '../adapters/download/anchor-file-saver.ts';
import { createSameBoyEmulator } from '../adapters/emulator/sameboy/sameboy-emulator.ts';
import { attachGamepads, browserGamepads } from '../adapters/input/gamepad.ts';
import { createInputMux } from '../adapters/input/input-mux.ts';
import { attachKeyboard } from '../adapters/input/keyboard.ts';
import { createIndexedDbProjectStore } from '../adapters/storage/indexeddb-project-store.ts';
import { createIndexedDbRomStore } from '../adapters/storage/indexeddb-rom-store.ts';
import type { AppServices } from './services.ts';
import { createEmulatorSession } from './session/emulator-session.ts';
import { loadExamples } from './session/examples.ts';
import { createProjectSession, isProjectAction } from './session/project-session.ts';
import { AppShell } from './shell/AppShell.tsx';
import { M1_VIEWS } from './views/m1-views.ts';
import { M1B_VIEWS } from './views/m1b-views.ts';
import { M2_VIEWS } from './views/m2-views.ts';
import { registerViews } from './views/registry.ts';
import './theme/base.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

registerViews(M1_VIEWS);
registerViews(M1B_VIEWS);
registerViews(M2_VIEWS);
const emulator = await createSameBoyEmulator();
// Without Web Audio (or if the worklet cannot load) the emulator simply runs silently.
const audio = await createWebAudioOutput().catch(() => null);
const session = createEmulatorSession({
  emulator,
  romStore: createIndexedDbRomStore(),
  audio,
  page: document,
  diagnostics: () => ({
    frameTimeP95Ms: emulator.frameTimeP95Ms(),
    frameWorkP95Ms: emulator.frameWorkP95Ms(),
    emulatedFps: emulator.emulatedFps(),
    audioUnderflows: audio?.underflows ?? 0,
    audioOverflows: audio?.overflows ?? 0,
  }),
});
await session.init();

const assembler = createRgbdsAssembler();
// Compiled ahead of time, so a build works once the network is gone (M2 research.md R4).
void assembler.prepare().catch((error: unknown) => {
  console.error('Could not prepare the assembler', error);
});
const projects = createProjectSession({
  store: createIndexedDbProjectStore(),
  assembler,
  archive: createFflateArchive(),
  files: createAnchorFileSaver(),
  examples: loadExamples(),
  runRom: (bytes, fileName) => session.runBuiltRom(bytes, fileName),
  publish: (event) => {
    session.publish(event);
  },
  page: document,
});
await projects.init();
const services: AppServices = {
  ...session,
  project: projects.state,
  dispatch(action) {
    if (isProjectAction(action)) projects.dispatch(action);
    else session.dispatch(action);
  },
};

// Keyboard and game controllers work whether or not the controller view is shown (FR-006).
const input = createInputMux((button, pressed) => {
  session.dispatch({ type: pressed ? 'ButtonDown' : 'ButtonUp', button });
});
attachKeyboard(window, input('keyboard'));
attachGamepads(browserGamepads(), input('gamepad'), (names) => {
  session.setGamepads(names);
});

createRoot(root).render(
  <StrictMode>
    <AppShell services={services} />
  </StrictMode>,
);
