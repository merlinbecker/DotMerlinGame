import { expect, test, type Locator, type Page } from '@playwright/test';
import { loadRom, openApp, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

const byteAt = (slot: Locator, row: string, index: number) => slot.getByTestId(`row-${row}`).getByTestId('byte').nth(index);

async function goTo(slot: Locator, address: string) {
  await slot.getByLabel('Go to address').fill(address);
  await slot.getByRole('button', { name: 'Go' }).click();
}

test('shows memory of the running test ROM by area and bank (US1)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-mem');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'hex');
  await expect(slot.getByRole('button', { name: '1/s' })).toHaveAttribute('aria-pressed', 'true');

  // WRAM $C000 + i = i XOR $5A (tests/roms/src/inspect-mem.asm)
  await expect(byteAt(slot, '$C000', 1)).toHaveText('5B');

  await slot.getByLabel('Area').selectOption('rom');
  for (let i = 0; i < 3; i++) await slot.getByRole('button', { name: 'Next bank' }).click();
  await expect(slot.getByText('mapped')).toBeVisible();
  await expect(byteAt(slot, '$4000', 0)).toHaveText('03');

  await slot.getByLabel('Area').selectOption('cart-ram');
  await slot.getByRole('button', { name: 'Next bank' }).click();
  await expect(byteAt(slot, '$A000', 0)).toHaveText('01');
  await expect(byteAt(slot, '$A000', 1)).toHaveText('C1');
  await expect(slot.getByText('locked')).toBeVisible();

  await slot.getByLabel('Area').selectOption('io');
  await goTo(slot, 'FF40');
  await expect(slot.getByTestId('row-$FF40')).toContainText('LCDC');
});

async function rowWidth(slot: Locator) {
  return Number(await slot.locator('[data-row-width]').getAttribute('data-row-width'));
}

async function noHorizontalScroll(page: Page, slot: Locator) {
  const content = await slot.evaluate((el) => el.scrollWidth <= el.clientWidth);
  const whole = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  return content && whole;
}

test('fits 8 bytes per row in a narrow portrait slot and 16 in a large maximized slot (FR-005)', async ({ page }) => {
  // Approximate Boox Palma viewport in portrait; replaced by the measured values in T074.
  await openApp(page);
  await loadRom(page, 'inspect-mem');
  await page.setViewportSize({ width: 412, height: 915 });
  const slot = page.locator('[data-testid="slot"]').first();
  await switchTo(slot, 'hex');
  await expect.poll(() => rowWidth(slot)).toBe(8);
  expect(await noHorizontalScroll(page, slot)).toBe(true);
  await slot.getByRole('button', { name: 'Maximize' }).click();
  // Approximate Boox Go Color 7 in landscape (also replaced by measured values in T074).
  await page.setViewportSize({ width: 840, height: 632 });
  await expect.poll(() => rowWidth(slot)).toBe(16);
});
