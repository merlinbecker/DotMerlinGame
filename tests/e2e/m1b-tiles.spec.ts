import { expect, test } from '@playwright/test';
import { loadRom, openApp, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('shows the tiles of the running ROM and details of a tapped tile (US3)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-gfx');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'tiles');
  const canvas = slot.getByRole('img', { name: 'Tiles 0 to 127' });
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas box');
  // Tile 17: column 1, row 1 of the first block.
  await canvas.click({ position: { x: (box.width / 16) * 1.5, y: (box.height / 8) * 1.5 } });
  await expect(slot.getByTestId('tile-detail')).toContainText('Tile 17 · $8110');
});
