import { parseDiagnostics, type BuildResult, type Diagnostic, type DiagnosticTool, type ProjectSettings, type SourceFile } from '../../../core/index.ts';
import type { RgbdsFactory, RgbdsModule } from './rgbds-types.ts';

export type RgbdsTools = Readonly<Record<DiagnosticTool, RgbdsFactory>>;

const WORK_DIR = '/project';
const OBJECT = 'build.o';
const ROM = 'build.gb';
const SYMBOLS = 'build.sym';
const MAP = 'build.map';
/** Pads the ROM with the value of unused flash, as RGBDS recommends for real hardware. */
const PAD_VALUE = '0xFF';

type Run = { readonly code: number; readonly module: RgbdsModule; readonly diagnostics: readonly Diagnostic[] };

function mkdirs(module: RgbdsModule, path: string): void {
  const parts = path.split('/').slice(0, -1);
  let current = '';
  for (const part of parts) {
    current = current === '' ? part : `${current}/${part}`;
    if (!module.FS.analyzePath(current).exists) module.FS.mkdir(current);
  }
}

/** One fresh instance and file system per tool: the instances exit after main. */
async function runTool(tools: RgbdsTools, tool: DiagnosticTool, args: readonly string[], files: readonly SourceFile[]): Promise<Run> {
  const lines: string[] = [];
  const module = await tools[tool]({ print: (text) => lines.push(text), printErr: (text) => lines.push(text) });
  module.FS.mkdir(WORK_DIR);
  module.FS.chdir(WORK_DIR);
  for (const file of files) {
    mkdirs(module, file.path);
    module.FS.writeFile(file.path, file.content);
  }
  let code: number;
  try {
    code = module.callMain(['--color', 'never', ...args]);
  } catch (error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status !== 'number') {
      const message = error instanceof Error ? error.message : String(error);
      return { code: 1, module, diagnostics: [{ file: null, line: null, severity: 'error', message: `${tool} stopped: ${message}`, tool }] };
    }
    code = status;
  }
  const diagnostics = parseDiagnostics(lines, tool);
  // A failure must never look like success, even if the tool's wording was not recognized.
  if (code !== 0 && !diagnostics.some((d) => d.severity === 'error')) {
    return { code, module, diagnostics: [...diagnostics, { file: null, line: null, severity: 'error', message: lines.join(' ') || `${tool} failed`, tool }] };
  }
  return { code, module, diagnostics };
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** rgbasm → rgblink → rgbfix; stops at the first failing stage (contracts/ports.md). */
export async function runPipeline(tools: RgbdsTools, files: readonly SourceFile[], settings: ProjectSettings): Promise<Omit<BuildResult, 'durationMs'>> {
  const asm = await runTool(tools, 'rgbasm', ['-o', OBJECT, settings.entry], files);
  const diagnostics = [...asm.diagnostics];
  if (asm.code !== 0) return { success: false, diagnostics };

  const object = { path: OBJECT, content: asm.module.FS.readFile(OBJECT) };
  const link = await runTool(tools, 'rgblink', ['-o', ROM, '-n', SYMBOLS, '-m', MAP, OBJECT], [object]);
  diagnostics.push(...link.diagnostics);
  if (link.code !== 0) return { success: false, diagnostics };

  const linked = { path: ROM, content: link.module.FS.readFile(ROM) };
  const fix = await runTool(tools, 'rgbfix', ['-v', '-p', PAD_VALUE, '-t', settings.title, '-m', settings.mbc, '-r', String(settings.ramSize), ROM], [linked]);
  diagnostics.push(...fix.diagnostics);
  if (fix.code !== 0) return { success: false, diagnostics };

  return {
    success: true,
    rom: fix.module.FS.readFile(ROM).slice(),
    symbols: text(link.module.FS.readFile(SYMBOLS)),
    map: text(link.module.FS.readFile(MAP)),
    diagnostics,
  };
}
