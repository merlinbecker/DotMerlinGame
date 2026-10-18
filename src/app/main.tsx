import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createIdleServices } from './services.ts';
import { AppShell } from './shell/AppShell.tsx';
import './theme/base.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <AppShell services={createIdleServices()} />
  </StrictMode>,
);
