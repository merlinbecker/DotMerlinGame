import { expect, test } from '@playwright/test';
import { loadRom, openApp, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('shows the paused state at once and the new state right after a reset (FR-010, research.md R6)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-mem');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'hex');
  await slot.getByLabel('Area').selectOption('io');
  await slot.getByLabel('Go to address').fill('FF04');
  await slot.getByRole('button', { name: 'Go' }).click();
  const div = slot.getByTestId('row-$FF04').getByTestId('byte');
  const frame = () => slot.locator('[data-frame]').first().getAttribute('data-frame');

  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Pause' }).click();
  // At 1/s the view would otherwise show a state up to a second old.
  await page.waitForTimeout(300);
  const paused = await div.textContent();
  const pausedFrame = await frame();
  await slot.getByRole('button', { name: 'Refresh' }).click();
  await page.waitForTimeout(300);
  expect(await div.textContent()).toBe(paused);
  expect(await frame()).toBe(pausedFrame);

  await page.getByRole('button', { name: 'Resume' }).click();
  await page.waitForTimeout(2500);
  expect(Number(await frame())).toBeGreaterThan(60);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect.poll(async () => Number(await frame()), { timeout: 500 }).toBeLessThan(30);
});
