/** Reads the four DMG shades from the design tokens as [r, g, b] (0 = lightest). */
export function readShades(element: Element = document.documentElement): [number, number, number][] {
  const style = getComputedStyle(element);
  return [0, 1, 2, 3].map((i) => {
    const value = style.getPropertyValue(`--game-shade-${i}`).trim();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
    if (!hex) return [255 - i * 85, 255 - i * 85, 255 - i * 85];
    const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex;
    return [0, 2, 4].map((o) => parseInt(full.slice(o, o + 2), 16)) as [number, number, number];
  });
}
