import { describe, expect, it } from 'vitest';
import { loadExamples } from '../../src/app/session/examples.ts';
import { projectProblem } from '../../src/core/index.ts';

describe('examples', () => {
  it('offers the hello example as a valid project without license and meta files', () => {
    const hello = loadExamples().find((e) => e.exampleId === 'hello');
    expect(hello).toBeDefined();
    if (!hello) return;
    expect(projectProblem(hello)).toBeNull();
    expect(hello.files.map((f) => f.path).sort()).toEqual(['hardware.inc', 'main.asm']);
  });

  it('refuses an example without project.json', () => {
    expect(() => loadExamples({ '/examples/x/main.asm': 'nop' })).toThrow('project.json');
  });
});
