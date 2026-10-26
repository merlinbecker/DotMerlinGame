import { expect, test } from '@playwright/test';
import { loadRom, openApp, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('shows background and window map with the visible area (US4)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-gfx');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'tilemaps');
  await expect(slot.getByRole('img', { name: 'Background map' })).toBeVisible();
  await expect(slot.getByTestId('map-info')).toContainText('SCX 100 SCY 200');
  await slot.getByRole('button', { name: 'Window' }).click();
  await expect(slot.getByRole('img', { name: 'Window map' })).toBeVisible();
  await expect(slot.getByTestId('map-info')).toContainText('Window at (80, 40)');
});
