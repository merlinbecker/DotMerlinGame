import { expect, test } from '@playwright/test';
import { loadRom, openApp } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('dotmerlingame-rom');
      req.onsuccess = req.onerror = req.onblocked = () => {
        resolve();
      };
    });
  });
});

test('shows header data and the matching bank count (US8-AS1, AS2)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'mbc5');
  const header = page.getByTestId('rom-header');
  await expect(header).toContainText('MBC5');
  await expect(header).toContainText('512 KiB, 32 banks');
  await expect(header).toContainText('RAM');
  const map = page.locator('[data-view="memory-map"]');
  await expect(map).toContainText('Loaded ROM: 32 banks of 16 KiB.');
  // The switchable region may be on the first page; page forward if needed.
  const banked = map.locator('[data-kind="rom-banked"]');
  await expect(banked).toContainText('ROM bank 1–31');
  await expect(map.locator('[data-kind="rom-fixed"]')).toContainText('ROM bank 0');
});

test('shows the empty states without a ROM (US8-AS3)', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('[data-view="rom-info"]')).toContainText('No ROM loaded');
  await expect(page.locator('[data-view="memory-map"]')).toContainText('No ROM loaded: bank count unknown.');
});

test('pages through the regions instead of scrolling when the slot is small', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  // Portrait: two slots; switch the second one to the memory map with the header arrows.
  const second = page.locator('[data-testid="slot"]').nth(1);
  for (let i = 0; i < 4 && (await second.getAttribute('data-view')) !== 'memory-map'; i++) {
    await second.getByRole('button', { name: 'Next view' }).click();
  }
  await expect(second).toHaveAttribute('data-view', 'memory-map');
  await expect(second.getByRole('button', { name: 'Next page' })).toBeVisible();
  const first = await second.locator('li').first().textContent();
  await second.getByRole('button', { name: 'Next page' }).click();
  expect(await second.locator('li').first().textContent()).not.toBe(first);
  const overflow = await second.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(overflow).toBeLessThanOrEqual(1);
});
