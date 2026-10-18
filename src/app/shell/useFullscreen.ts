import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
  };
}

const isFullscreen = () => document.fullscreenElement !== null;

/**
 * Fullscreen via the Fullscreen API. Browsers only allow it after a user gesture; it hides the
 * address bar and system bars in Chrome on Android.
 */
export function useFullscreen() {
  const active = useSyncExternalStore(subscribe, isFullscreen);
  const supported = document.fullscreenEnabled;

  const toggle = () => {
    if (isFullscreen()) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return { supported, active, toggle };
}
