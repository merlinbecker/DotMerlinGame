import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
}

/** False while the tab is in the background or the device is locked. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribe, () => document.visibilityState === 'visible');
}
