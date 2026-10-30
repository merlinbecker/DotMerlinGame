import type { SourceFile } from '../ports/assembler.ts';
import { encodeSource, MAX_PROJECT_NAME_LENGTH, MAX_TITLE_LENGTH, type ProjectSettings } from '../project/model.ts';
import { analyze } from './analyze.ts';
import { bankFileName, generateBank, generateMain, headerTitle, MAIN_FILE } from './generate.ts';

export interface GeneratedSource {
  readonly name: string;
  readonly settings: ProjectSettings;
  readonly files: readonly SourceFile[];
}

/** A project name from a file name. */
function projectName(fileName: string): string {
  const name = fileName.replace(/\.[^.]*$/, '').trim().slice(0, MAX_PROJECT_NAME_LENGTH).trim();
  return name === '' ? 'imported' : name;
}

/** ROM → source. `pause` runs between banks, so the page stays responsive and can show progress (research.md R7). */
export async function generateSource(rom: Uint8Array, fileName: string, pause: (bank: number, banks: number) => Promise<void> = () => Promise.resolve()): Promise<GeneratedSource> {
  const analysis = analyze(rom);
  const files: SourceFile[] = [{ path: MAIN_FILE, content: encodeSource(generateMain(rom, analysis, fileName)) }];
  for (let bank = 0; bank < analysis.bankCount; bank++) {
    await pause(bank, analysis.bankCount);
    files.push({ path: bankFileName(bank), content: encodeSource(generateBank(rom, analysis, bank)) });
  }
  const name = projectName(fileName);
  return { name, files, settings: { entry: MAIN_FILE, title: (headerTitle(rom) || name).slice(0, MAX_TITLE_LENGTH), mbc: 'ROM_ONLY', ramSize: 0, fixHeader: false } };
}
