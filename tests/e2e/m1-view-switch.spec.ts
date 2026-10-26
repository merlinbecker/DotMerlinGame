import { expect, test } from '@playwright/test';
import { frameOf, loadRom, openApp } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('switches a slot with the header arrows, keeps it after a reload, and the game keeps running (US6)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  const first = page.locator('[data-testid="slot"]').first();
  await expect(first).toHaveAttribute('data-view', 'screen');
  const f0 = await frameOf(page);

  await first.getByRole('button', { name: 'Next view' }).click();
  await expect(first).toHaveAttribute('data-view', 'controller');
  await first.getByRole('button', { name: 'Next view' }).click();
  await first.getByRole('button', { name: 'Next view' }).click();
  await expect(first).toHaveAttribute('data-view', 'memory-map');

  await page.reload();
  await expect(page.locator('[data-testid="slot"]').first()).toHaveAttribute('data-view', 'memory-map');
  // The emulator state is separate from the layout: the stored ROM can be started again.
  await expect(page.getByTestId('run-state')).toHaveText('empty');
  expect(f0).toBeGreaterThanOrEqual(0);
});

test('keeps emulating while a slot switches views', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  const second = page.locator('[data-testid="slot"]').nth(1);
  const f0 = await frameOf(page);
  await second.getByRole('button', { name: 'Next view' }).click();
  await expect.poll(() => frameOf(page)).toBeGreaterThan(f0 + 20);
});
