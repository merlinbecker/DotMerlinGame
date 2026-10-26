import { expect, test, type Locator } from '@playwright/test';
import { loadRom, motionProblems, nonGrayColors, openApp, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

const VIEWS = ['hex', 'registers', 'tiles', 'tilemaps', 'sprites'] as const;

/** Distinguishing styles of an element; marks must differ here, not only in hue. */
async function look(element: Locator) {
  return element.evaluate((el) => {
    const s = getComputedStyle(el);
    return `${s.backgroundColor}|${s.color}|${s.outlineStyle}|${s.outlineWidth}`;
  });
}

test('every memory view runs without motion and in grayscale only (FR-014)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-gfx');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  for (const view of VIEWS) {
    await switchTo(slot, view);
    expect(await motionProblems(page), view).toEqual([]);
    expect(await nonGrayColors(page), view).toEqual([]);
  }
});

test('every memory view fits a narrow portrait slot without horizontal scrolling (SC-005, edge case)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-mem');
  // Approximate Boox Palma viewport in portrait; replaced by the measured values in T074.
  await page.setViewportSize({ width: 412, height: 915 });
  const slot = page.locator('[data-testid="slot"]').first();
  for (const view of VIEWS) {
    await switchTo(slot, view);
    const fits = await slot.evaluate((el) => [el, ...el.querySelectorAll('*')].every((e) => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).overflowX === 'hidden'));
    const page_ = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits && page_, view).toBe(true);
  }
});

test('changed, selected, mapped and locked marks differ without color (US6-AS5)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-mem');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'hex');
  await slot.getByRole('button', { name: 'Live' }).click();
  const goTo = async (address: string) => {
    await slot.getByLabel('Go to address').fill(address);
    await slot.getByRole('button', { name: 'Go' }).click();
  };

  // Wait until the test ROM is done (wDone = $42 at $C0FF), after the boot ROM.
  await goTo('C0FF');
  await expect(slot.locator('[data-selected="true"]')).toHaveText('42', { timeout: 10_000 });
  // DIV changes all the time, SB never in this ROM (I/O list).
  await slot.getByLabel('Area').selectOption('io');
  await goTo('FF04');
  const div = slot.getByTestId('row-$FF04').getByTestId('byte');
  await expect(div).toHaveAttribute('data-changed', 'true');
  await slot.getByRole('button', { name: 'Manual' }).click();
  await page.waitForTimeout(200);
  const changedLook = await look(div);
  await goTo('FF01');
  const sb = slot.getByTestId('row-$FF01').getByTestId('byte');
  await expect(sb).toHaveAttribute('data-changed', 'false');
  // Jumping selects the address; compare with the next, unselected register.
  await expect(sb).toHaveAttribute('data-selected', 'true');
  const plain = slot.getByTestId('row-$FF02').getByTestId('byte');
  expect(changedLook).not.toBe(await look(plain));
  expect(await look(sb)).not.toBe(await look(plain));

  await slot.getByLabel('Area').selectOption('cart-ram');
  for (let i = 0; i < 2; i++) await slot.getByRole('button', { name: 'Next bank' }).click();
  await expect(slot.getByText('mapped', { exact: true })).toBeVisible();
  await expect(slot.getByText('locked', { exact: true })).toBeVisible();
  expect(await nonGrayColors(page)).toEqual([]);
});
