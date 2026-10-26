export type RowWidth = 8 | 16;

/** Characters of one hex row: "$XXXX" plus a gap, then "XX " per byte. */
export const ROW_CHARS: Record<RowWidth, number> = { 8: 6 + 8 * 3, 16: 6 + 16 * 3 };

/** 16 bytes per row if such a row fits at the minimum font size, else 8 (Clarification Q3). */
export function bytesPerRow(availableWidth: number, charWidth: number): RowWidth {
  return availableWidth >= ROW_CHARS[16] * charWidth ? 16 : 8;
}

/** First address of the row containing `address`; rows start at multiples of the row width from `areaBase`. */
export function alignTop(address: number, areaBase: number, rowWidth: RowWidth): number {
  return areaBase + Math.floor((address - areaBase) / rowWidth) * rowWidth;
}
