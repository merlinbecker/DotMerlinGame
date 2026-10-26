/** Reads a px design token (e.g. --tile-pixel-min) as a number; `fallback` where styles are not computed (tests). */
export function readTokenPx(name: string, fallback: number, element: Element = document.documentElement): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
