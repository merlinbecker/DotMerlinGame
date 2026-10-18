import { expect, test, type Page } from '@playwright/test';

/** Returns every color of every element (incl. focus, caret, SVG) that is not pure gray. */
async function nonGrayColors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const properties = [
      'color',
      'background-color',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color',
      'outline-color',
      'caret-color',
      'fill',
      'stroke',
    ];
    const problems: string[] = [];
    for (const element of [document.documentElement, ...document.querySelectorAll('*')]) {
      const style = getComputedStyle(element);
      for (const property of properties) {
        const value = style.getPropertyValue(property).trim();
        if (value === '' || value === 'none' || value === 'auto' || value === 'transparent') continue;
        if (value.startsWith('url(')) continue;
        const match = /^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(value);
        if (!match) {
          problems.push(`${element.tagName} ${property}: unparsed ${value}`);
          continue;
        }
        const [, r, g, b, alpha] = match;
        if (alpha !== undefined && Number(alpha) === 0) continue;
        if (r !== g || g !== b) problems.push(`${element.tagName} ${property}: ${value}`);
      }
    }
    return problems;
  });
}

async function motionProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    if (document.getAnimations().length > 0) problems.push(`${document.getAnimations().length} running animations`);
    for (const element of document.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      if (style.transitionDuration.split(',').some((d) => parseFloat(d) !== 0)) {
        problems.push(`${element.tagName} transition-duration ${style.transitionDuration}`);
      }
      if (style.animationName !== 'none') problems.push(`${element.tagName} animation ${style.animationName}`);
    }
    return problems;
  });
}

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
