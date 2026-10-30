import { expect, test } from '@playwright/test';
import { canvasColors, frameOf, openProjectFromExample, replaceSource, switchTo } from './support.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    for (const name of ['dotmerlingame-rom', 'dotmerlingame-projects']) {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = req.onerror = req.onblocked = () => {
          resolve();
        };
      });
    }
  });
});

test('builds the example and runs it in the screen (US1-AS1, SC-001)', async ({ page }) => {
  const { editor, build } = await openProjectFromExample(page);
  await expect(editor.locator('.cm-content')).toContainText('A first program');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
  await expect.poll(async () => (await canvasColors(page)).length).toBeGreaterThan(1);
  await expect(page.getByTestId('run-state')).toHaveCount(0); // ROM Info is not in a slot here
});

test('a changed source runs without reloading the app (US1-AS4)', async ({ page }) => {
  const { editor, build } = await openProjectFromExample(page);
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in');
  await expect.poll(async () => (await canvasColors(page)).length).toBeGreaterThan(1);

  // One shade only: a program that just waits with the LCD as the boot left it, palette all white.
  await replaceSource(editor, 'SECTION "H",ROM0[$100]\nnop\njp $150\nds $150-@,0\nSECTION "M",ROM0[$150]\nxor a\nldh [$FF47],a\nloop: jr loop\n');
  await expect(build.getByText('Source changed since this build.')).toBeVisible();
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in');
  await expect.poll(async () => (await canvasColors(page)).length).toBe(1);
});

test('a message names file and line, and a tap leads to the line (US1-AS2, SC-004)', async ({ page }) => {
  const { editor, build } = await openProjectFromExample(page);
  await replaceSource(editor, 'SECTION "a",ROM0\nnop\nnop\nbogus x\n');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toHaveText('Build failed');
  const message = build.getByTestId('diagnostic').first();
  await expect(message).toContainText('main.asm:4');
  await message.click();
  await expect(editor.locator('.cm-activeLine, .cm-content')).toBeFocused();
  const line = await editor.locator('.cm-content').evaluate((content) => {
    const selection = (content.getRootNode() as Document).getSelection();
    const node = selection?.anchorNode;
    const element = node instanceof Element ? node : node?.parentElement;
    return element?.closest('.cm-line')?.textContent ?? null;
  });
  expect(line).toContain('bogus');
});

test('a build run leaves the stored ROM and blocks nothing (M2 R8)', async ({ page }) => {
  const { editor, build, slots } = await openProjectFromExample(page);
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in');
  await page.reload();
  // Nothing was stored as a ROM, so the app offers no stored ROM.
  const info = slots.nth(5);
  await info.getByRole('button', { name: 'Next view' }).waitFor();
  const romInfo = page.locator('[data-testid="slot"]').filter({ has: page.getByTestId('rom-file') });
  await expect(romInfo.getByRole('button', { name: 'Start stored ROM' })).toHaveCount(0);
});

test('stops an endless build, stays usable, and builds again (spec edge case)', async ({ page }) => {
  test.setTimeout(60_000);
  const { editor, build } = await openProjectFromExample(page);
  await replaceSource(editor, 'REPT 2000000000\nDEF x = 1\nENDR\n');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toHaveText('Building');
  await expect(editor.getByLabel('File')).toBeEnabled(); // the page answers meanwhile
  await expect(build.getByTestId('build-status')).toContainText('took too long', { timeout: 20_000 });

  await replaceSource(editor, 'SECTION "H",ROM0[$100]\nnop\njp $150\nds $150-@,0\nSECTION "M",ROM0[$150]\nloop: jr loop\n');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in', { timeout: 20_000 });
});

test('builds offline once the page is loaded, also after a timeout (SC-005, research.md R4)', async ({ page, context }) => {
  test.setTimeout(60_000);
  const { editor, build } = await openProjectFromExample(page);
  await page.waitForTimeout(1500); // workers finish compiling
  await context.setOffline(true);
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in');

  await replaceSource(editor, 'REPT 2000000000\nDEF x = 1\nENDR\n');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('took too long', { timeout: 20_000 });
  await replaceSource(editor, 'SECTION "H",ROM0[$100]\nnop\njp $150\nds $150-@,0\nSECTION "M",ROM0[$150]\nloop: jr loop\n');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in', { timeout: 20_000 });
  await context.setOffline(false);
});

test('two editors show the same text, and nothing is lost while typing fast (contract rule 4)', async ({ page }) => {
  const { editor, slots } = await openProjectFromExample(page);
  const second = slots.nth(5);
  await switchTo(second, 'editor');
  const text = 'SECTION "same",ROM0\nwasd jk\n';
  await replaceSource(editor, text);
  await expect(editor.locator('.cm-content')).toContainText('wasd jk');
  await expect(second.locator('.cm-content')).toContainText('wasd jk');
  await expect(second.locator('.cm-line').first()).toHaveText('SECTION "same",ROM0');
});
