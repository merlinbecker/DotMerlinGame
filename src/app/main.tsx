import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
const session = createEmulatorSession({ emulator, romStore: createIndexedDbRomStore(), page: document });
await session.init();

createRoot(root).render(
  <StrictMode>
    <AppShell services={session} />
  </StrictMode>,
);
