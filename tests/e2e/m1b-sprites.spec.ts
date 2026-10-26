import { expect, test } from '@playwright/test';
import { loadRom, openApp, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('lists the OAM entries of the running ROM and names hidden ones (US5)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-gfx');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'sprites');
  await expect(slot.getByTestId('sprite-0')).toContainText('#0 Y 16 X 8 tile $01');
  // Page forward until an entry is on screen; the number per page depends on the slot height.
  const show = async (index: number) => {
    for (let i = 0; i < 40 && (await slot.getByTestId(`sprite-${String(index)}`).count()) === 0; i++) await slot.getByRole('button', { name: 'Next page' }).click();
  };
  await show(5);
  await expect(slot.getByTestId('sprite-5')).toContainText('hidden');
  await show(39);
  await expect(slot.getByTestId('sprite-39')).toContainText('hidden');
});
