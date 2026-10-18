import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './shell/AppShell.tsx';
import './theme/base.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
