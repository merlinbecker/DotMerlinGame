// Two-tier license check (research.md R2) and freshness check of THIRD_PARTY_LICENSES.
//   node scripts/check-licenses.ts
import { readFileSync } from 'node:fs';
import { renderThirdPartyLicenses } from './generate-third-party.ts';
import { readPackages } from './license-data.ts';
import { evaluateLicenses, type LicenseException } from './license-policy.ts';

const exceptions = JSON.parse(readFileSync('third_party/license-exceptions.json', 'utf8')) as LicenseException[];
const results = evaluateLicenses([...readPackages('runtime'), ...readPackages('dev')], exceptions);

const listed = results.filter((r) => r.verdict === 'listed');
const blocked = results.filter((r) => r.verdict === 'blocked');

console.log(`Checked ${results.length} packages.`);
if (listed.length > 0) {
  console.log(`\nDev tooling with non-allowlisted licenses (allowed, listed only):`);
  for (const r of listed) console.log(`  ${r.name}@${r.version}  ${r.license ?? ''}`);
}

let failed = false;
if (blocked.length > 0) {
  failed = true;
  console.error(`\nBlocked licenses:`);
  for (const r of blocked) console.error(`  [${r.scope}] ${r.name}@${r.version}  ${r.license ?? 'none'}  (${r.reason})`);
}

const expected = renderThirdPartyLicenses();
if (readFileSync('THIRD_PARTY_LICENSES', 'utf8') !== expected.licenses || readFileSync('third_party/npm.md', 'utf8') !== expected.table) {
  failed = true;
  console.error('\nTHIRD_PARTY_LICENSES or third_party/npm.md is outdated. Run: npm run licenses:generate');
}

if (failed) process.exit(1);
console.log('\nLicense check passed.');
