import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebAudioOutput } from '../adapters/audio/web-audio-output.ts';
import { createSameBoyEmulator } from '../adapters/emulator/sameboy/sameboy-emulator.ts';
import { createIndexedDbRomStore } from '../adapters/storage/indexeddb-rom-store.ts';
import { createEmulatorSession } from './session/emulator-session.ts';
import { AppShell } from './shell/AppShell.tsx';
import { M1_VIEWS } from './views/m1-views.ts';
import { registerViews } from './views/registry.ts';
import './theme/base.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

registerViews(M1_VIEWS);
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

createRoot(root).render(
  <StrictMode>
    <AppShell services={session} />
  </StrictMode>,
);
