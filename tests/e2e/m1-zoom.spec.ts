import { expect, test, type Page } from '@playwright/test';
import { frameOf, loadRom, openApp } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

const slot = (page: Page, view: string) => page.locator(`[data-view="${view}"]`);
const visibleSlots = (page: Page) => page.locator('[data-testid="slot"]:not([hidden])');

test('maximizes a slot with the header button and restores the grid (US7-AS1, AS2)', async ({ page }) => {
  await openApp(page);
  const before = await visibleSlots(page).count();
  expect(before).toBeGreaterThan(1);
  await slot(page, 'screen').getByRole('button', { name: 'Maximize' }).click();
  await expect(visibleSlots(page)).toHaveCount(1);
  const box = await slot(page, 'screen').boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(Math.round(box?.width ?? 0)).toBe(Math.round(Math.min(main?.width ?? 0, main?.height ?? 0)));
  await slot(page, 'screen').getByRole('button', { name: 'Restore' }).click();
  await expect(visibleSlots(page)).toHaveCount(before);
});

test('works on the controller too; a double tap there does not zoom (US7-AS5)', async ({ page }) => {
  await openApp(page);
  await slot(page, 'controller').locator('[data-button="A"]').dblclick();
  await expect(slot(page, 'controller').getByRole('button', { name: 'Maximize' })).toBeVisible();
  await expect(visibleSlots(page)).not.toHaveCount(1);
  await slot(page, 'controller').getByRole('button', { name: 'Maximize' }).click();
  await expect(visibleSlots(page)).toHaveCount(1);
});

test('keeps emulating while maximized and remembers the zoom after a reload (US7-AS3, AS4)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  await slot(page, 'screen').getByRole('button', { name: 'Maximize' }).click();
  const f0 = await frameOf(page);
  await expect.poll(() => frameOf(page)).toBeGreaterThan(f0 + 30);
  await page.reload();
  await expect(visibleSlots(page)).toHaveCount(1);
  await expect(slot(page, 'screen').getByRole('button', { name: 'Restore' })).toBeVisible();
});
