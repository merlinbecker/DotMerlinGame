import { expect, test, type Locator, type Page } from '@playwright/test';
import { loadRom, openApp, romInfoPage, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

const updates = async (slot: Locator) => Number(await slot.locator('[data-updates]').getAttribute('data-updates'));

/** Hex updates during `ms` while the game runs. */
async function updatesDuring(page: Page, slot: Locator, ms: number) {
  const before = await updates(slot);
  await page.waitForTimeout(ms);
  return (await updates(slot)) - before;
}

async function hexNextToScreen(page: Page) {
  await openApp(page);
  await loadRom(page, 'inspect-mem');
  const slot = page.locator('[data-testid="slot"]').nth(3);
  await switchTo(slot, 'hex');
  return slot;
}

test('a new memory view starts at 1/s and keeps its rate after a reload (US6-AS2, AS6)', async ({ page }) => {
  const slot = await hexNextToScreen(page);
  await expect(slot.getByRole('button', { name: '1/s' })).toHaveAttribute('aria-pressed', 'true');
  await slot.getByRole('button', { name: 'Live' }).click();
  await page.reload();
  await expect(page.locator('[data-testid="slot"]').nth(3).getByRole('button', { name: 'Live' })).toHaveAttribute('aria-pressed', 'true');
});

test('redraws at most at the chosen rate and the game keeps full speed (SC-004, US6-AS1)', async ({ page }) => {
  const slot = await hexNextToScreen(page);
  expect(await updatesDuring(page, slot, 5000)).toBeLessThanOrEqual(6);

  await slot.getByRole('button', { name: 'Live' }).click();
  const live = await updatesDuring(page, slot, 5000);
  expect(live).toBeGreaterThanOrEqual(30);
  expect(live).toBeLessThanOrEqual(60);

  await slot.getByRole('button', { name: 'Manual' }).click();
  await page.waitForTimeout(200);
  expect(await updatesDuring(page, slot, 2000)).toBe(0);
  const before = await updates(slot);
  await slot.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => updates(slot)).toBe(before + 1);
  await page.waitForTimeout(1000);
  expect(await updates(slot)).toBe(before + 1);

  // Headless Chromium is no reference device; this only guards against a collapse (SC-002 is checked on the device).
  await romInfoPage(page, 'Header');
  await expect.poll(async () => Number(await page.getByTestId('emulated-fps').textContent()), { timeout: 15_000 }).toBeGreaterThanOrEqual(55);
  await expect(page.getByTestId('frame-work')).toContainText('ms');
});

test('a hidden memory view gets no updates (FR-013, US6-AS4)', async ({ page }) => {
  const slot = await hexNextToScreen(page);
  await slot.getByRole('button', { name: 'Live' }).click();
  const screen = page.locator('[data-testid="slot"]').first();
  await screen.getByRole('button', { name: 'Maximize' }).click();
  await page.waitForTimeout(300);
  expect(await updatesDuring(page, slot, 2000)).toBe(0);
});
