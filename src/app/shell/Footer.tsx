import { useFullscreen } from './useFullscreen.ts';
import styles from './Footer.module.css';

/** Always shows which version and build run on the device (FR-003); offers fullscreen (FR-023). */
export function Footer() {
  const fullscreen = useFullscreen();

  return (
    <footer className={styles.footer}>
      <span data-testid="build-version">
        v{__APP_VERSION__} · Build {__BUILD_VERSION__}
      </span>
      {fullscreen.supported && (
        <button type="button" className={styles.button} onClick={fullscreen.toggle}>
          {fullscreen.active ? 'Exit fullscreen' : 'Fullscreen'}
        </button>
      )}
    </footer>
  );
}
