import type { Diagnostic, DiagnosticTool } from '../ports/assembler.ts';

const HEADER = /^(error|warning|FATAL): (.*)$/;
// `at main.asm(3)`, `at main.asm::mac(2)`, `at main.asm::REPT~1(3)`: the file ends at `::`, the line counts in the file.
const LOCATION = /^\s+at (.+?)(?:::.*)?\((\d+)\)$/;

/** Reads the stderr lines of an RGBDS tool run with `--color never` (M2 research.md R5). */
export function parseDiagnostics(lines: readonly string[], tool: DiagnosticTool): Diagnostic[] {
  const found: Diagnostic[] = [];
  let open: { severity: Diagnostic['severity']; message: string; file: string | null; line: number | null } | null = null;
  const close = () => {
    if (open) found.push({ ...open, tool });
    open = null;
  };
  for (const line of lines) {
    const header = HEADER.exec(line);
    if (header) {
      close();
      open = { severity: header[1] === 'warning' ? 'warning' : 'error', message: header[2] ?? '', file: null, line: null };
      continue;
    }
    if (!open) continue;
    const location = LOCATION.exec(line);
    if (location && open.file === null) {
      open.file = location[1] ?? null;
      open.line = Number(location[2]);
    } else if (location || /^\s+<- /.test(line)) {
      continue; // outer context of the include or macro chain
    } else {
      close(); // the summary line or a list that belongs to no message
    }
  }
  close();
  return found;
}
