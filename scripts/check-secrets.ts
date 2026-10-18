// Scans all tracked files for secrets (research.md R4).
//   node scripts/check-secrets.ts
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);

try {
  execFileSync(resolve('node_modules/.bin/secretlint'), ['--secretlintrc', '.secretlintrc.json', '--maskSecrets', ...files], {
    stdio: 'inherit',
  });
  console.log(`Secret scan passed (${files.length} tracked files).`);
} catch {
  process.exit(1);
}
