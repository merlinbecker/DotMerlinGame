import { expect, test, type Page } from '@playwright/test';
import { loadRom, openApp } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

const screen = (page: Page) => page.locator('[data-view="screen"]');
const redraws = async (page: Page) => Number(await page.getByTestId('screen-canvas').getAttribute('data-redraws'));
const frame = async (page: Page) => Number(await page.getByTestId('screen-canvas').getAttribute('data-frame'));

test('starts in normal mode on a fresh device (US5-AS4)', async ({ page }) => {
  await openApp(page);
  await expect(screen(page).getByRole('button', { name: 'E-Ink mode' })).toHaveAttribute('aria-pressed', 'false');
});

test('redraws at most at the chosen rate while the emulation keeps full speed (SC-008)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  await screen(page).getByRole('button', { name: 'E-Ink mode' }).click();
  await screen(page).getByRole('button', { name: '4/s' }).click();
  await page.waitForTimeout(500);
  const r0 = await redraws(page);
  const f0 = await frame(page);
  await page.waitForTimeout(2000);
  const drawn = (await redraws(page)) - r0;
  const emulated = (await frame(page)) - f0;
  expect(drawn).toBeLessThanOrEqual(10); // 4/s for 2 s, with a little slack
  expect(drawn).toBeGreaterThanOrEqual(4);
  expect(emulated).toBeGreaterThanOrEqual(90); // about 60 frames per second keep running
});

test('keeps the mode and its settings after a reload (US5-AS3)', async ({ page }) => {
  await openApp(page);
  await screen(page).getByRole('button', { name: 'E-Ink mode' }).click();
  await screen(page).getByRole('button', { name: 'Dither' }).click();
  await screen(page).getByRole('button', { name: '2/s' }).click();
  await page.reload();
  await expect(screen(page).getByRole('button', { name: 'E-Ink mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(screen(page).getByRole('button', { name: 'Dither' })).toHaveAttribute('aria-pressed', 'true');
  await expect(screen(page).getByRole('button', { name: '2/s' })).toHaveAttribute('aria-pressed', 'true');
});

test('shows only black and white when dithering (US5-AS2)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  await screen(page).getByRole('button', { name: 'E-Ink mode' }).click();
  await screen(page).getByRole('button', { name: 'Dither' }).click();
  await page.waitForTimeout(1500);
  const colors = await page.getByTestId('screen-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data ?? new Uint8ClampedArray();
    const set = new Set<string>();
    for (let i = 0; i < data.length; i += 4) set.add(`${data[i]}`);
    return [...set].sort();
  });
  expect(colors).toEqual(['0', '255']);
});
