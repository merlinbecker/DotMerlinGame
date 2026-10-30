import { BANK_SIZE } from './analyze.ts';

export type ImportVerdict = 'identical' | 'padded' | 'different' | 'not-verified';

/** Compares a build with the imported ROM. The linker writes whole banks, so a short ROM may gain a tail. */
export function compareBuild(original: Uint8Array, built: Uint8Array): { readonly verdict: ImportVerdict; readonly paddedBytes: number } {
  const padded = built.length - original.length;
  for (let i = 0; i < original.length; i++) if (built[i] !== original[i]) return { verdict: 'different', paddedBytes: 0 };
  if (padded === 0) return { verdict: 'identical', paddedBytes: 0 };
  return padded > 0 && original.length % BANK_SIZE !== 0 ? { verdict: 'padded', paddedBytes: padded } : { verdict: 'different', paddedBytes: 0 };
}
