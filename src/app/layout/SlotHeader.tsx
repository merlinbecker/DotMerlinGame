import styles from './SlotHeader.module.css';

interface SlotHeaderProps {
  readonly title: string;
}

/** Header of a slot; the only place where a slot's view will be switched (FR-002). */
export function SlotHeader({ title }: SlotHeaderProps) {
  return (
    <div className={styles.header} data-testid="slot-header">
      <button type="button" className={styles.switch} aria-label="Previous view" disabled>
        ‹
      </button>
      <span className={styles.title}>{title}</span>
      <button type="button" className={styles.switch} aria-label="Next view" disabled>
        ›
      </button>
    </div>
  );
}
