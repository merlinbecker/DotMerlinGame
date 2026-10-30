// Runs the RGBDS tools off the main thread, so an endless macro can be ended with terminate() (research.md R4).
import createRgbasm from './generated/rgbasm.mjs';
import rgbasmWasm from './generated/rgbasm.wasm?url';
import createRgbfix from './generated/rgbfix.mjs';
import rgbfixWasm from './generated/rgbfix.wasm?url';
import createRgblink from './generated/rgblink.mjs';
import rgblinkWasm from './generated/rgblink.wasm?url';
import { runPipeline, type RgbdsTools } from './pipeline.ts';
import type { RgbdsFactory } from './rgbds-types.ts';
import type { WorkerReply, WorkerRequest } from './worker-protocol.ts';

interface WorkerScope {
  postMessage(message: WorkerReply): void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}
const scope = self as unknown as WorkerScope;

/** Compiled before any build: after this no network is needed. */
async function precompiled(create: RgbdsFactory, url: string): Promise<RgbdsFactory> {
  const compiled = await WebAssembly.compileStreaming(fetch(url));
  return (options) =>
    create({
      ...options,
      instantiateWasm(imports, done) {
        void WebAssembly.instantiate(compiled, imports).then((instance) => {
          done(instance, compiled);
        });
        return {};
      },
    });
}

const tools: Promise<RgbdsTools> = Promise.all([
  precompiled(createRgbasm, rgbasmWasm),
  precompiled(createRgblink, rgblinkWasm),
  precompiled(createRgbfix, rgbfixWasm),
]).then(([rgbasm, rgblink, rgbfix]) => ({ rgbasm, rgblink, rgbfix }));

void tools.then(
  () => {
    scope.postMessage({ type: 'ready' });
  },
  (error: unknown) => {
    scope.postMessage({ type: 'failed', message: String(error) });
  },
);

scope.onmessage = (event) => {
  const { files, settings } = event.data;
  void tools
    .then((ready) => runPipeline(ready, files, settings))
    .then(
      (result) => {
        scope.postMessage({ type: 'result', result });
      },
      (error: unknown) => {
        scope.postMessage({ type: 'failed', message: String(error) });
      },
    );
};
