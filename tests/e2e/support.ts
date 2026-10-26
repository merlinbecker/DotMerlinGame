import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';

export function romFile(name: string) {
  return { name: `${name}.gb`, mimeType: 'application/octet-stream', buffer: readFileSync(`tests/roms/build/${name}.gb`) };
}

/** Large viewport: enough slots for screen, controller and ROM Info side by side. */
export async function openApp(page: Page) {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  await expect(page.locator('[data-view="rom-info"]')).toBeVisible();
}

/** Opens a page of the ROM Info view (ROM, Start, Sound, Header). */
export async function romInfoPage(page: Page, label: 'ROM' | 'Start' | 'Sound' | 'Header') {
  await page.locator('[data-view="rom-info"]').getByRole('group', { name: 'Pages' }).getByRole('button', { name: label }).click();
}

export async function loadRom(page: Page, name: string) {
  await page.getByTestId('rom-file').setInputFiles(romFile(name));
  const replace = page.getByRole('button', { name: 'Replace' });
  if (await replace.isVisible().catch(() => false)) await replace.click();
}

export async function frameOf(page: Page): Promise<number> {
  return Number(await page.getByTestId('screen-canvas').getAttribute('data-frame'));
}

/** Distinct RGB colors currently on the game canvas. */
export async function canvasColors(page: Page): Promise<string[]> {
  return page.getByTestId('screen-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return [...colors];
  });
}

/** Switches a slot to a view with the header arrows (FR-001). */
export async function switchTo(slot: Locator, view: string) {
  for (let i = 0; i < 12 && (await slot.getAttribute('data-view')) !== view; i++) await slot.getByRole('button', { name: 'Next view' }).click();
  await expect(slot).toHaveAttribute('data-view', view);
}

/** Returns every color of every element (incl. focus, caret, SVG) that is not pure gray. */
export async function nonGrayColors(page: Page): Promise<string[]> {
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

export async function motionProblems(page: Page): Promise<string[]> {
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

