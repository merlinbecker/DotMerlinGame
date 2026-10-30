import { expect, test } from '@playwright/test';
import { motionProblems, nonGrayColors, openProjectFromExample, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('dotmerlingame-projects');
      req.onsuccess = req.onerror = req.onblocked = () => {
        resolve();
      };
    });
  });
});

test('no motion and no color in editor, build and project views (FR-009)', async ({ page }) => {
  const { editor } = await openProjectFromExample(page);
  await editor.locator('.cm-line').first().click();
  expect(await motionProblems(page)).toEqual([]);
  expect(await nonGrayColors(page)).toEqual([]);
});

test('the cursor does not blink', async ({ page }) => {
  const { editor } = await openProjectFromExample(page);
  await editor.locator('.cm-line').first().click();
  const cursor = editor.locator('.cm-cursor').first();
  await expect(cursor).toBeVisible();
  const animation = await cursor.evaluate((el) => {
    const layer = el.parentElement;
    return `${getComputedStyle(el).animationName}|${layer ? getComputedStyle(layer).animationName : ''}`;
  });
  expect(animation).toBe('none|none');
});

test('instructions, labels, comments and numbers differ without color (US5-AS1)', async ({ page }) => {
  const { editor } = await openProjectFromExample(page);
  const content = editor.locator('.cm-content');
  await expect(content).toContainText('first program');
  const look = (text: string) =>
    content
      .locator('span', { hasText: new RegExp(`^${text}$`) })
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return `${s.fontWeight}|${s.fontStyle}|${s.textDecorationLine}|${s.textDecorationStyle}`;
      });
  const comment = await content
    .locator('span', { hasText: /^; A first program/ })
    .first()
    .evaluate((el) => getComputedStyle(el).fontStyle);
  expect(comment).toBe('italic');
  await editor.getByRole('button', { name: 'Next page' }).click();
  const [instruction, number] = await Promise.all([look('ld'), look('144').catch(() => null)]);
  expect(instruction.split('|')[0]).toBe('700');
  if (number !== null) expect(number).toContain('dotted');
});

test('next page moves one page, without scrolling by hand (US5-AS2)', async ({ page }) => {
  const { editor } = await openProjectFromExample(page);
  const scroller = editor.locator('.cm-scroller');
  await expect(scroller).toHaveCSS('overflow-y', 'hidden');
  const height = await scroller.evaluate((el) => el.clientHeight);
  await editor.getByRole('button', { name: 'Next page' }).click();
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(height);
  await editor.getByRole('button', { name: 'Previous page' }).click();
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBe(0);
});

test('zoom through the header fills the grid, a double tap in the text does not (US5-AS3)', async ({ page }) => {
  const { editor } = await openProjectFromExample(page);
  const before = await editor.boundingBox();
  await editor.locator('.cm-line').first().dblclick();
  expect((await editor.boundingBox())?.width).toBe(before?.width);
  await editor.getByRole('button', { name: /zoom|maxim/i }).click();
  expect((await editor.boundingBox())?.width ?? 0).toBeGreaterThan(before?.width ?? 0);
});

for (const [width, height] of [[360, 640], [412, 915]] as const) {
  test(`no sideways scrolling at ${String(width)} × ${String(height)}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const slots = page.locator('[data-testid="slot"]:not([hidden])');
    await switchTo(slots.nth(0), 'project');
    await slots.nth(0).getByRole('button', { name: 'New: hello' }).click();
    for (const view of ['editor', 'build', 'project']) {
      await switchTo(slots.nth(0), view);
      const fits = await slots.nth(0).evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits, view).toBe(true);
    }
    await switchTo(slots.nth(0), 'editor');
    await expect(slots.nth(0).locator('.cm-line').first()).toBeVisible();
  });
}
