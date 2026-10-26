import styles from './Inspect.module.css';

/** Shown instead of values: no ROM loaded (FR-015), or no snapshot received yet. */
export function InspectNotice({ romLoaded }: { readonly romLoaded: boolean }) {
  return (
    <p className={styles.notice} role="status">
      {romLoaded ? 'Waiting for data' : 'No ROM loaded'}
    </p>
  );
}
