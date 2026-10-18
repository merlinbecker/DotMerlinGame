import { Grid } from '../layout/Grid.tsx';
import { Footer } from './Footer.tsx';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Grid />
      </main>
      <Footer />
    </div>
  );
}
