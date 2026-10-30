import type { AudioOutputPort } from '../../core/index.ts';
import type { LevelReport, WorkletMessage } from './audio-worklet-processor.ts';
import workletUrl from './audio-worklet-processor.ts?worker&url';

/** Fade-out time before the context is suspended (ms); matches the worklet ramp. */
const FADE_MS = 10;
const GAIN_TIME_CONSTANT = 0.005;

/** Web Audio output (AudioWorklet + GainNode). Created suspended; unlock() needs a user gesture. */
export async function createWebAudioOutput(): Promise<AudioOutputPort> {
  const context = new AudioContext({ latencyHint: 'interactive' });
  await context.audioWorklet.addModule(workletUrl);
  const node = new AudioWorkletNode(context, 'dmg-output', { numberOfInputs: 0, outputChannelCount: [2] });
  const gain = context.createGain();
  node.connect(gain).connect(context.destination);

  let volume = 0.5;
  let muted = false;
  let reported = 0;
  let pushedSinceReport = 0;
  let underflows = 0;
  let overflows = 0;

  const post = (message: WorkletMessage, transfer: Transferable[] = []) => {
    node.port.postMessage(message, transfer);
  };
  node.port.onmessage = (event: MessageEvent<LevelReport>) => {
    reported = event.data.buffered;
    pushedSinceReport = 0;
    underflows = event.data.underflows;
    overflows = event.data.overflows;
  };
  const applyGain = () => {
    gain.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, GAIN_TIME_CONSTANT);
  };
  applyGain();

  // Leaving and coming back quickly: a resume waits for the suspend still under way, or the sound would stay off.
  let transition: Promise<void> = Promise.resolve();
  const inOrder = (step: () => Promise<void>) => {
    const next = transition.then(step);
    transition = next.catch(() => undefined);
    return next;
  };

  return {
    sampleRate: context.sampleRate,
    push(samples) {
      if (context.state !== 'running') return;
      pushedSinceReport += samples.length / 2;
      post({ type: 'samples', samples }, [samples.buffer]);
    },
    async unlock() {
      await context.resume();
    },
    get unlocked() {
      return context.state === 'running';
    },
    setVolume(next) {
      volume = Math.min(1, Math.max(0, next));
      applyGain();
    },
    setMuted(next) {
      muted = next;
      applyGain();
    },
    get bufferedSamples() {
      return reported + pushedSinceReport;
    },
    get underflows() {
      return underflows;
    },
    get overflows() {
      return overflows;
    },
    suspend() {
      return inOrder(async () => {
        if (context.state !== 'running') return;
        post({ type: 'fade', target: 0 });
        await new Promise((resolve) => setTimeout(resolve, FADE_MS));
        await context.suspend();
        post({ type: 'clear' });
      });
    },
    resume() {
      return inOrder(async () => {
        if (context.state !== 'suspended') return;
        await context.resume();
        post({ type: 'fade', target: 1 });
      });
    },
  };
}
