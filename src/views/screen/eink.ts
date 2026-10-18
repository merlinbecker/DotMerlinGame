/** Ordered 4x4 Bayer matrix (values 0..15). */
export const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

const WIDTH = 160;

export interface EinkOptions {
  /** Gray level 0..255 for the shades 0..3 (from design tokens). */
  readonly palette: readonly [number, number, number, number];
  /** Ordered dithering to pure black and white for 1-bit e-ink displays. */
  readonly dither: boolean;
}

/** Turns DMG shade indices into gray levels (0..255) for an e-ink friendly picture. */
export function renderEink(screen: Uint8Array, options: EinkOptions): Uint8Array {
  const out = new Uint8Array(screen.length);
  for (let i = 0; i < screen.length; i++) {
    const level = options.palette[screen[i] ?? 0] ?? 0;
    if (!options.dither) {
      out[i] = level;
      continue;
    }
    const threshold = ((BAYER_4X4[((Math.floor(i / WIDTH) & 3) << 2) | (i % WIDTH & 3)] ?? 0) + 0.5) * 16;
    out[i] = level > threshold ? 255 : 0;
  }
  return out;
}
