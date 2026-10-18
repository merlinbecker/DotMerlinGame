// Two-tier license policy (research.md R2, ADR-0003).

export const RUNTIME_ALLOWLIST: readonly string[] = [
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Apache-2.0',
  'Zlib',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
];

const COPYLEFT = /\b(A|L)?GPL\b|SSPL/i;
const UNKNOWN = new Set(['', 'UNKNOWN', 'UNLICENSED']);

export interface PackageLicense {
  readonly name: string;
  readonly version: string;
  readonly license: string | undefined;
  /** `runtime` ships with the app, `dev` is build and test tooling only. */
  readonly scope: 'runtime' | 'dev';
}

export interface LicenseException {
  readonly package: string;
  readonly license: string;
  /** Path of the ADR that justifies the exception. */
  readonly adr: string;
}

export type Verdict = 'ok' | 'listed' | 'blocked';

export interface LicenseResult extends PackageLicense {
  readonly verdict: Verdict;
  readonly reason: string;
}

/** Splits an SPDX expression into OR alternatives of AND terms; AND binds tighter than OR. */
function alternatives(expression: string): string[][] {
  const plain = expression.replace(/[()]/g, ' ').trim();
  return plain.split(/\s+OR\s+/).map((alternative) => alternative.split(/\s+AND\s+/).map((term) => term.trim()));
}

function isUnknown(term: string): boolean {
  return UNKNOWN.has(term.toUpperCase()) || term.endsWith('*');
}

function evaluate(scope: PackageLicense['scope'], license: string | undefined): { verdict: Verdict; reason: string } {
  const expression = license?.trim() ?? '';
  if (isUnknown(expression)) return { verdict: 'blocked', reason: 'missing or unknown license' };
  const options = alternatives(expression);

  if (scope === 'runtime') {
    const allowed = options.some((terms) => terms.every((term) => RUNTIME_ALLOWLIST.includes(term)));
    return allowed ? { verdict: 'ok', reason: 'allowlisted' } : { verdict: 'blocked', reason: 'not on the runtime allowlist' };
  }

  if (options.some((terms) => terms.every((term) => RUNTIME_ALLOWLIST.includes(term)))) {
    return { verdict: 'ok', reason: 'allowlisted' };
  }
  const usable = options.filter((terms) => terms.every((term) => !COPYLEFT.test(term) && !isUnknown(term)));
  return usable.length > 0
    ? { verdict: 'listed', reason: 'non-allowlisted dev tooling license' }
    : { verdict: 'blocked', reason: 'copyleft or unknown license in dev tooling' };
}

export function evaluateLicenses(
  packages: readonly PackageLicense[],
  exceptions: readonly LicenseException[],
): LicenseResult[] {
  for (const exception of exceptions) {
    if (exception.adr.trim() === '') {
      throw new Error(`License exception for ${exception.package} has no ADR reference`);
    }
  }
  return packages.map((pkg) => {
    const result = evaluate(pkg.scope, pkg.license);
    const excepted = exceptions.some((e) => e.package === pkg.name && e.license === pkg.license);
    if (result.verdict === 'blocked' && excepted) return { ...pkg, verdict: 'ok', reason: 'exception with ADR' };
    return { ...pkg, ...result };
  });
}
