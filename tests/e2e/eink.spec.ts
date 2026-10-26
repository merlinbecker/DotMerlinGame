import { expect, test } from '@playwright/test';
import { motionProblems, nonGrayColors } from './support.ts';

test('runs no animations or transitions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('slot').first()).toBeVisible();
  expect(await motionProblems(page)).toEqual([]);
});

test('runs no animations with reduced motion either', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('slot').first()).toBeVisible();
  expect(await motionProblems(page)).toEqual([]);
});

test('uses grayscale only, also for focused controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('slot').first()).toBeVisible();
  expect(await nonGrayColors(page)).toEqual([]);

  const visited = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const all = [...document.querySelectorAll('*')];
      return { id: String(all.indexOf(element)), outlineWidth: parseFloat(getComputedStyle(element).outlineWidth) };
    });
    if (!focused || visited.has(focused.id)) break;
    visited.add(focused.id);
    expect(focused.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(await nonGrayColors(page)).toEqual([]);
  }
  expect(visited.size).toBeGreaterThan(0);
});

test('has touch targets at least as large as the token', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('slot').first()).toBeVisible();
  const result = await page.evaluate(() => {
    const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--touch-target-min'));
    const controls = [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')];
    const tooSmall = controls
      .map((element) => element.getBoundingClientRect())
      .filter((box) => box.width > 0 || box.height > 0) // not rendered (e.g. hidden file input): no touch target
      .filter((box) => box.width < min || box.height < min)
      .map((box) => `${box.width}x${box.height}`);
    return { min, count: controls.length, tooSmall };
  });
  expect(result.min).toBeGreaterThan(0);
  expect(result.count).toBeGreaterThan(0);
  expect(result.tooSmall).toEqual([]);
});

test('saves a grayscale screenshot for manual review', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('slot').first()).toBeVisible();
  await page.addStyleTag({ content: 'html { filter: grayscale(1); }' });
  await page.screenshot({ path: 'test-results/m0-grayscale.png', fullPage: true });
});

test('applies the e-ink rules to all four M1 views, with e-ink controls open (FR-016)', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  for (const view of ['screen', 'controller', 'rom-info', 'memory-map']) {
    await expect(page.locator(`[data-view="${view}"]`)).toBeVisible();
  }
  await page.locator('[data-view="screen"]').getByRole('button', { name: 'E-Ink mode' }).click();
  expect(await nonGrayColors(page)).toEqual([]);
  expect(await motionProblems(page)).toEqual([]);
  const tooSmall = await page.evaluate(() => {
    const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--touch-target-min'));
    return [...document.querySelectorAll<HTMLElement>('[data-testid="slot"] button')]
      .map((element) => ({ label: element.getAttribute('aria-label') ?? element.textContent, box: element.getBoundingClientRect() }))
      .filter(({ box }) => (box.width > 0 || box.height > 0) && (box.width < min || box.height < min))
      .map(({ label }) => label);
  });
  expect(tooSmall).toEqual([]);
});
