import { expect, test } from '@playwright/test';
import { frameOf, loadRom, openApp, romInfoPage } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('unlocks sound with the first tap anywhere, also on a touch screen (US4-AS2)', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  await openApp(page);
  await expect(page.getByRole('button', { name: 'Enable sound' })).toBeVisible();
  await page.locator('[data-view="memory-map"]').tap({ position: { x: 20, y: 200 } });
  await expect(page.getByRole('button', { name: 'Enable sound' })).toHaveCount(0);
  await context.close();
});

test('unlocks sound with the Enable sound button', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Enable sound' }).click();
  await expect(page.getByRole('button', { name: 'Enable sound' })).toHaveCount(0);
});

test('mutes from the screen header immediately while the emulation keeps running (US4-AS3)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'apu-ch1');
  const mute = page.locator('[data-view="screen"]').getByRole('button', { name: 'Mute' });
  await mute.click();
  await expect(page.locator('[data-view="screen"]').getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');
  const before = await frameOf(page);
  await expect.poll(() => frameOf(page)).toBeGreaterThan(before + 10);
});

test('pauses in the background and continues without a time jump (FR-020, edge case)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  await expect(page.getByTestId('run-state')).toHaveText('running');
  const setVisibility = (state: 'hidden' | 'visible') =>
    page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', { value, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
  await setVisibility('hidden');
  await expect(page.getByTestId('run-state')).toHaveText('paused');
  const frozen = await frameOf(page);
  await page.waitForTimeout(500);
  expect(await frameOf(page)).toBe(frozen);
  await setVisibility('visible');
  await expect(page.getByTestId('run-state')).toHaveText('running');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(frozen);
  // No catch-up burst: after one second at most about 60 + 3 frames have passed.
  const resumed = await frameOf(page);
  await page.waitForTimeout(1000);
  expect((await frameOf(page)) - resumed).toBeLessThanOrEqual(70);
});

test('changes the volume in steps and remembers it (FR-019)', async ({ page }) => {
  await openApp(page);
  await romInfoPage(page, 'Sound');
  await page.getByRole('button', { name: 'Volume up' }).click();
  await expect(page.getByTestId('volume')).toHaveText('Volume 60 %');
  await page.reload();
  // The ROM Info page itself is remembered in the layout.
  await expect(page.getByTestId('volume')).toHaveText('Volume 60 %');
});
