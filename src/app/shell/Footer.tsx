import styles from './Footer.module.css';

/** Always shows which version and build run on the device (FR-003). */
export function Footer() {
  return (
    <footer className={styles.footer}>
      v{__APP_VERSION__} · Build {__BUILD_VERSION__}
    </footer>
  );
}
