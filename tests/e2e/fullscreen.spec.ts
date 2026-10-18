import { expect, test } from '@playwright/test';

test('toggles fullscreen from the footer', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Fullscreen' });
  await expect(button).toBeVisible();

  await button.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  const exit = page.getByRole('button', { name: 'Exit fullscreen' });
  await expect(exit).toBeVisible();

  await exit.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toBeVisible();
});

test('hides the fullscreen button when the browser does not support it', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false });
  });
  await page.goto('/');
  await expect(page.getByTestId('build-version')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toHaveCount(0);
});

test('hides the fullscreen button in the installed app', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      const result = original(query);
      if (query === '(display-mode: fullscreen)') Object.defineProperty(result, 'matches', { value: true });
      return result;
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('build-version')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fullscreen' })).toHaveCount(0);
});
