import type { HeaderAction } from '../../core/index.ts';
import styles from './SlotHeader.module.css';

interface SlotHeaderProps {
  readonly title: string;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly actions?: readonly HeaderAction[];
  readonly onAction?: (action: HeaderAction) => void;
}

/**
 * Header of a slot: the only place where a slot's view is switched (FR-013). Switching works through
 * the arrow buttons only; there is deliberately no swipe gesture.
 */
export function SlotHeader({ title, onPrevious, onNext, actions = [], onAction }: SlotHeaderProps) {
  return (
    <div className={styles.header} data-testid="slot-header">
      <button type="button" className={styles.switch} aria-label="Previous view" onClick={onPrevious}>
        ‹
      </button>
      <span className={styles.title}>{title}</span>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={styles.action}
          aria-pressed={action.pressed}
          onClick={() => onAction?.(action)}
        >
          {action.label}
        </button>
      ))}
      <button type="button" className={styles.switch} aria-label="Next view" onClick={onNext}>
        ›
      </button>
    </div>
  );
}
