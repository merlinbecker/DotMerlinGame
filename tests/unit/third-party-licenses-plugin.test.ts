// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { LICENSES_FILE, thirdPartyLicensesPlugin } from '../../build/third-party-licenses-plugin.ts';

describe('thirdPartyLicensesPlugin', () => {
  it('emits THIRD_PARTY_LICENSES unchanged into the bundle', () => {
    const plugin = thirdPartyLicensesPlugin();
    const emitFile = vi.fn();
    const generate = plugin.generateBundle as unknown as (this: { emitFile: typeof emitFile }) => void;
    generate.call({ emitFile });
    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'asset', fileName: LICENSES_FILE, source: expect.stringContaining('Third-party software') as string }),
    );
  });
});
