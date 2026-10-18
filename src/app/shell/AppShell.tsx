import { ServicesContext, type AppServices } from '../services.ts';
import { Grid } from '../layout/Grid.tsx';
import { Footer } from './Footer.tsx';
import styles from './AppShell.module.css';

export function AppShell({ services }: { readonly services: AppServices }) {
  return (
    <ServicesContext value={services}>
      <div className={styles.shell}>
        <main className={styles.main}>
          <Grid />
        </main>
        <Footer />
      </div>
    </ServicesContext>
  );
}
