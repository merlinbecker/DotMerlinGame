import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PROJECT_NAME } from '../../src/config/project.ts';

const buildInfo = JSON.parse(readFileSync('dist/build-info.json', 'utf8')) as { appVersion: string; version: string };
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

/** Measures all slots in one step, so a re-render cannot happen between two measurements. */
async function slotBoxes(page: Page) {
  await expect(page.getByTestId('slot').first()).toBeVisible();
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="slot"]')].map((slot) => {
      const { x, y, width, height } = slot.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
}

/** Waits until the first two slots are arranged as expected (layout settles after a resize). */
async function expectArrangement(page: Page, arrangement: 'stacked' | 'side-by-side') {
  await expect
    .poll(async () => {
      const [a, b] = await slotBoxes(page);
      if (!a || !b) return 'missing';
      if (Math.abs(b.x - a.x) <= 1 && b.y > a.y) return 'stacked';
      if (Math.abs(b.y - a.y) <= 1 && b.x > a.x) return 'side-by-side';
      return 'other';
    })
    .toBe(arrangement);
}

test('shows square empty slots with headers', async ({ page }) => {
  await page.goto('/');
  const boxes = await slotBoxes(page);
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  for (const box of boxes) expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
  await expect(page.getByTestId('slot-header')).toHaveCount(boxes.length);
});

test('stacks slots in portrait and places them side by side in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expectArrangement(page, 'stacked');

  await page.setViewportSize({ width: 844, height: 390 });
  await expectArrangement(page, 'side-by-side');
});

test('never scrolls horizontally on very small screens', async ({ page }) => {
  await page.setViewportSize({ width: 300, height: 600 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect((await slotBoxes(page)).length).toBeGreaterThanOrEqual(2);
});

test('shows app version and build version in the footer', async ({ page }) => {
  await page.goto('/');
  expect(buildInfo.appVersion).toBe(packageJson.version);
  await expect(page.getByTestId('build-version')).toHaveText(`v${buildInfo.appVersion} · Build ${buildInfo.version}`);
});

test('registers no service worker', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  const registrations = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  expect(registrations).toBe(0);
});

test('links a manifest named after the project', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(new RegExp(PROJECT_NAME));
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  if (!href) throw new Error('manifest link has no href');
  const response = await page.request.get(href);
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    display: string;
    start_url: string;
    icons: { sizes: string }[];
  };
  expect(manifest.name).toBe(PROJECT_NAME);
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.start_url).toBeTruthy();
  const sizes = manifest.icons.map((icon) => icon.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
});
