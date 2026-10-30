import { describe, expect, it } from 'vitest';
import { pageCount, pageOfTop, topOfPage } from '../../src/adapters/editor/paging.ts';

describe('editor pages', () => {
  it('counts pages of the visible height', () => {
    expect(pageCount(100, 100)).toBe(1);
    expect(pageCount(101, 100)).toBe(2);
    expect(pageCount(1000, 100)).toBe(10);
    expect(pageCount(50, 0)).toBe(1);
  });

  it('finds the page of a position', () => {
    expect(pageOfTop(0, 100)).toBe(0);
    expect(pageOfTop(199, 100)).toBe(1);
    expect(pageOfTop(200, 100)).toBe(2);
  });

  it('keeps the page inside the document', () => {
    expect(topOfPage(1, 100, 1000)).toBe(100);
    expect(topOfPage(50, 100, 250)).toBe(200);
    expect(topOfPage(-1, 100, 250)).toBe(0);
  });
});
