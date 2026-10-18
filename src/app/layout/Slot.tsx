import { SlotHeader } from './SlotHeader.tsx';
import styles from './Slot.module.css';

interface SlotProps {
  readonly title: string;
}

export function Slot({ title }: SlotProps) {
  return (
    <section className={styles.slot} data-testid="slot" aria-label={title}>
      <SlotHeader title={title} />
      <div className={styles.content} />
    </section>
  );
}
