// Checks your own ROMs from roms/local/ (ignored by Git): ROM → source → build. Writes no files (M3 FR-010).
//   npm run roundtrip:local
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import createRgbasm from '../src/adapters/assembler/rgbds/generated/rgbasm.mjs';
import createRgbfix from '../src/adapters/assembler/rgbds/generated/rgbfix.mjs';
import createRgblink from '../src/adapters/assembler/rgbds/generated/rgblink.mjs';
import { runPipeline } from '../src/adapters/assembler/rgbds/pipeline.ts';
import { compareBuild } from '../src/core/disasm/verify.ts';
import { generateSource } from '../src/core/disasm/import.ts';

const DIRECTORY = 'roms/local';
const files = existsSync(DIRECTORY) ? readdirSync(DIRECTORY).filter((file) => /\.(gb|gbc|bin)$/i.test(file)) : [];
if (files.length === 0) console.log(`No ROMs in ${DIRECTORY}/.`);

let failed = 0;
for (const file of files) {
  const rom = new Uint8Array(readFileSync(join(DIRECTORY, file)));
  const started = performance.now();
  const { files: sources, settings } = await generateSource(rom, file);
  const result = await runPipeline({ rgbasm: createRgbasm, rgblink: createRgblink, rgbfix: createRgbfix }, sources, settings);
  const verdict = result.rom ? compareBuild(rom, result.rom).verdict : 'different';
  if (verdict === 'different') failed++;
  const hash = createHash('sha256').update(rom).digest('hex').slice(0, 12);
  console.log(`${verdict.padEnd(10)} ${hash} ${String(Math.round(performance.now() - started)).padStart(6)} ms  ${file}`);
}
process.exitCode = failed > 0 ? 1 : 0;
