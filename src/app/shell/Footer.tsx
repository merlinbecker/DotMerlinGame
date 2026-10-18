import styles from './Footer.module.css';

/** Always shows which build runs on the device (FR-003). */
export function Footer() {
  return <footer className={styles.footer}>Build {__BUILD_VERSION__}</footer>;
}
