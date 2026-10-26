import type { FrameSnapshot } from '../../src/core/index.ts';
import { createSameBoyEmulator } from '../../src/adapters/emulator/sameboy/sameboy-emulator.ts';
import { FIXTURE_FRAMES, FIXTURE_ROMS, writeFixture } from './inspection-fixtures.ts';
import { testRom } from './roms.ts';

/** Vitest global setup (node): records real inspection snapshots of the M1b test ROMs for jsdom view tests. */
export default async function setup(): Promise<void> {
  for (const name of FIXTURE_ROMS) {
    const emulator = await createSameBoyEmulator({ clock: null });
    await emulator.loadRom(testRom(name), { bootMode: 'direct-start', hardwareChecks: false });
    emulator.frameState.setInspectionDemand(true);
    emulator.frameState.setPublishRate({ kind: 'full' });
    const snapshots: FrameSnapshot[] = [];
    emulator.frameState.subscribe(() => {
      const snapshot = emulator.frameState.getSnapshot();
      if (snapshot && (FIXTURE_FRAMES as readonly number[]).includes(snapshot.frame)) snapshots.push(snapshot);
    });
    emulator.run();
    emulator.advance(Math.max(...FIXTURE_FRAMES));
    writeFixture(name, snapshots);
  }
}
