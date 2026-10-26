import { expect, test } from '@playwright/test';
import { loadRom, openApp, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('shows the registers of the running ROM and keeps them while paused (US2)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'inspect-regs');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'registers');
  // tests/roms/src/inspect-regs.asm
  await expect(slot.getByTestId('reg-A')).toHaveText('$12');
  await expect(slot.getByTestId('reg-HL')).toHaveText('$BCDE');
  await expect(slot.getByTestId('flag-C')).toHaveText('C ●');
  await expect(slot.getByTestId('reg-IME')).toHaveText('off');

  await page.getByRole('button', { name: 'Pause' }).click();
  const frame = await slot.locator('[data-frame]').getAttribute('data-frame');
  await page.waitForTimeout(2000);
  expect(await slot.locator('[data-frame]').getAttribute('data-frame')).toBe(frame);
  await page.getByRole('button', { name: 'Resume' }).click();
});
