import type { AssemblerPort, BuildResult } from '../../../core/index.ts';
import type { WorkerReply, WorkerRequest } from './worker-protocol.ts';

/** Ends a build that does not finish, e.g. an endless REPT (M2 spec edge case, research.md R4). */
export const BUILD_TIME_LIMIT_MS = 10_000;

export interface BuildWorker {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

interface Prepared {
  readonly worker: BuildWorker;
  readonly ready: Promise<void>;
}

function browserWorker(): BuildWorker {
  return new Worker(new URL('./rgbds.worker.ts', import.meta.url), { type: 'module' });
}

/**
 * Keeps a second prepared worker: after a timeout it takes over, so building still works offline
 * (research.md R4).
 */
export function createRgbdsAssembler(spawn: () => BuildWorker = browserWorker): AssemblerPort {
  const start = (): Prepared => {
    const worker = spawn();
    const ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data.type === 'ready') resolve();
        else if (event.data.type === 'failed') reject(new Error(event.data.message));
      };
      worker.onerror = (event) => {
        reject(new Error(event.message));
      };
    });
    ready.catch(() => undefined); // reported when a build uses this worker
    return { worker, ready };
  };

  let active: Prepared | null = null;
  let standby: Prepared | null = null;
  const prepareAll = () => {
    active ??= start();
    standby ??= start();
    return active;
  };

  return {
    async prepare() {
      await prepareAll().ready;
    },
    async build(files, settings) {
      const current = prepareAll();
      const started = performance.now();
      await current.ready;
      return new Promise<BuildResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          current.worker.terminate();
          active = standby;
          standby = null;
          prepareAll();
          resolve({ success: false, timedOut: true, diagnostics: [], durationMs: performance.now() - started });
        }, BUILD_TIME_LIMIT_MS);
        current.worker.onmessage = (event) => {
          clearTimeout(timer);
          if (event.data.type === 'result') resolve({ ...event.data.result, durationMs: performance.now() - started });
          else if (event.data.type === 'failed') reject(new Error(event.data.message));
        };
        current.worker.onerror = (event) => {
          clearTimeout(timer);
          reject(new Error(event.message));
        };
        current.worker.postMessage({ files, settings });
      });
    },
  };
}
