import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILD_TIME_LIMIT_MS, createRgbdsAssembler, type BuildWorker } from '../../src/adapters/assembler/rgbds/rgbds-assembler.ts';
import type { WorkerReply } from '../../src/adapters/assembler/rgbds/worker-protocol.ts';
import { defaultSettings } from '../../src/core/index.ts';

function fakeWorker() {
  const worker = {
    onmessage: null,
    onerror: null,
    posted: 0,
    terminated: false,
    postMessage() {
      this.posted++;
    },
    terminate() {
      this.terminated = true;
    },
    reply(data: WorkerReply) {
      this.onmessage?.({ data } as MessageEvent<WorkerReply>);
    },
  } as BuildWorker & { posted: number; terminated: boolean; reply(data: WorkerReply): void };
  return worker;
}

describe('RGBDS assembler adapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = async () => {
    const workers: ReturnType<typeof fakeWorker>[] = [];
    const assembler = createRgbdsAssembler(() => {
      const worker = fakeWorker();
      workers.push(worker);
      return worker;
    });
    const prepared = assembler.prepare();
    workers[0]?.reply({ type: 'ready' });
    workers[1]?.reply({ type: 'ready' });
    await prepared;
    return { assembler, workers };
  };

  it('prepares two workers ahead of any build', async () => {
    const { workers } = await setup();
    expect(workers).toHaveLength(2);
  });

  it('returns the result with its duration', async () => {
    const { assembler, workers } = await setup();
    const build = assembler.build([], defaultSettings('x'));
    await vi.advanceTimersByTimeAsync(0);
    workers[0]?.reply({ type: 'result', result: { success: true, diagnostics: [] } });
    expect(await build).toMatchObject({ success: true });
    expect(workers[0]?.terminated).toBe(false);
  });

  it('ends a build at the time limit, and the prepared worker takes over', async () => {
    const { assembler, workers } = await setup();
    const build = assembler.build([], defaultSettings('x'));
    await vi.advanceTimersByTimeAsync(BUILD_TIME_LIMIT_MS);
    expect(await build).toMatchObject({ success: false, timedOut: true });
    expect(workers[0]?.terminated).toBe(true);
    expect(workers).toHaveLength(3); // a new stand-by was started

    const next = assembler.build([], defaultSettings('x'));
    await vi.advanceTimersByTimeAsync(0);
    expect(workers[1]?.posted).toBe(1);
    workers[1]?.reply({ type: 'result', result: { success: true, diagnostics: [] } });
    expect(await next).toMatchObject({ success: true });
  });

  it('rejects when the worker itself fails', async () => {
    const { assembler, workers } = await setup();
    const build = assembler.build([], defaultSettings('x'));
    await vi.advanceTimersByTimeAsync(0);
    workers[0]?.reply({ type: 'failed', message: 'boom' });
    await expect(build).rejects.toThrow('boom');
  });
});
