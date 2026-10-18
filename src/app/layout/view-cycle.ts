/** Next or previous view for the header arrows (FR-013); there is deliberately no swipe gesture. */
export function cycleView(current: string | null, order: readonly string[], direction: 1 | -1): string | null {
  if (order.length === 0) return null;
  const index = current === null ? -1 : order.indexOf(current);
  if (index === -1) return (direction === 1 ? order[0] : order[order.length - 1]) ?? null;
  return order[(index + direction + order.length) % order.length] ?? null;
}
