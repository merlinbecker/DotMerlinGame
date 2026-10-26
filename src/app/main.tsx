import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebAudioOutput } from '../adapters/audio/web-audio-output.ts';
import { createSameBoyEmulator } from '../adapters/emulator/sameboy/sameboy-emulator.ts';
import { attachGamepads, browserGamepads } from '../adapters/input/gamepad.ts';
import { createInputMux } from '../adapters/input/input-mux.ts';
import { attachKeyboard } from '../adapters/input/keyboard.ts';
import { createIndexedDbRomStore } from '../adapters/storage/indexeddb-rom-store.ts';
import { createEmulatorSession } from './session/emulator-session.ts';
import { AppShell } from './shell/AppShell.tsx';
import { M1_VIEWS } from './views/m1-views.ts';
import { M1B_VIEWS } from './views/m1b-views.ts';
import { registerViews } from './views/registry.ts';
import './theme/base.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

registerViews(M1_VIEWS);
registerViews(M1B_VIEWS);
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
    audioUnderflows: audio?.underflows ?? 0,
    audioOverflows: audio?.overflows ?? 0,
  }),
});
await session.init();

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
    <AppShell services={session} />
  </StrictMode>,
);
