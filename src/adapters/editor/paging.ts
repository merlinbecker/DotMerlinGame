/** Pages of a document in a scroller without scrolling by hand (FR-009). `height` is the visible height. */
export function pageCount(documentHeight: number, height: number): number {
  if (height <= 0) return 1;
  return Math.max(1, Math.ceil(documentHeight / height - 0.001));
}

export function pageOfTop(top: number, height: number): number {
  if (height <= 0) return 0;
  return Math.max(0, Math.floor(top / height + 0.001));
}

export function topOfPage(page: number, height: number, documentHeight: number): number {
  const last = pageCount(documentHeight, height) - 1;
  return Math.min(Math.max(0, page), last) * Math.max(0, height);
}
