import { expect, test } from '@playwright/test';
import { canvasColors, frameOf, loadRom, openApp } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test('shows the own logo first, then the game (US2-AS1)', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('button', { name: 'Own boot ROM' })).toHaveAttribute('aria-pressed', 'true');
  await loadRom(page, 'pattern');
  // Logo phase: only white and the darkest shade (BGP $FC).
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
  expect((await canvasColors(page)).sort()).toEqual(['0,0,0', '255,255,255']);
  // Game phase: the checkerboard of the pattern ROM uses more shades.
  await expect.poll(async () => (await canvasColors(page)).length, { timeout: 10_000 }).toBeGreaterThan(2);
});

test('stops a ROM with a broken logo in hardware-near mode and says why (US2-AS4)', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Hardware-near checks' }).click();
  await loadRom(page, 'bad-logo');
  await expect(page.getByRole('status')).toHaveText('Stopped: header logo does not match.', { timeout: 10_000 });
  await expect(page.getByTestId('run-state')).toHaveText('halted');
});
