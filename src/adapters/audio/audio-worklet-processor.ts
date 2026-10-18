// Runs in the AudioWorkletGlobalScope (bundled by Vite as a worker). Plays the emulator's samples from a
// ring buffer and reports the fill level for pacing (research.md R8). No SharedArrayBuffer.
import { createRingBuffer } from './ring-buffer.ts';

interface WorkletProcessor {
  readonly port: MessagePort;
}
declare const AudioWorkletProcessor: { prototype: WorkletProcessor; new (): WorkletProcessor };
declare const sampleRate: number;
declare function registerProcessor(name: string, processor: new () => WorkletProcessor): void;

export type WorkletMessage =
  | { readonly type: 'samples'; readonly samples: Int16Array }
  | { readonly type: 'fade'; readonly target: 0 | 1 }
  | { readonly type: 'clear' };

export interface LevelReport {
  readonly type: 'level';
  readonly buffered: number;
  readonly underflows: number;
  readonly overflows: number;
}

const REPORT_EVERY = 8; // render quanta (128 frames each)

class DmgOutputProcessor extends AudioWorkletProcessor {
  private readonly ring = createRingBuffer(Math.round(sampleRate / 2));
  private quanta = 0;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
      const message = event.data;
      if (message.type === 'samples') this.ring.push(message.samples);
      else if (message.type === 'fade') this.ring.fade(message.target);
      else this.ring.clear();
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const [left, right] = outputs[0] ?? [];
    if (left) this.ring.pull(left, right ?? new Float32Array(left.length));
    if (++this.quanta % REPORT_EVERY === 0) {
      const report: LevelReport = { type: 'level', buffered: this.ring.buffered, underflows: this.ring.underflows, overflows: this.ring.overflows };
      this.port.postMessage(report);
    }
    return true;
  }
}

registerProcessor('dmg-output', DmgOutputProcessor);
