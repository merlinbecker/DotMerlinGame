import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { frameOf, openApp, romFile, switchTo } from './support.ts';

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

async function setup(page: import('@playwright/test').Page) {
  await openApp(page);
  const slots = page.locator('[data-testid="slot"]');
  const project = slots.nth(2);
  const editor = slots.nth(3);
  const build = slots.nth(4);
  await switchTo(project, 'project');
  await switchTo(editor, 'editor');
  await switchTo(build, 'build');
  return { project, editor, build };
}

test('imports a ROM as a project whose build is byte-identical (US1, FR-005)', async ({ page }) => {
  const { project, editor, build } = await setup(page);
  const original = romFile('inspect-mem');
  await project.getByTestId('rom-import-file').setInputFiles(original);
  await expect(project.getByTestId('rom-import')).toHaveText('Imported. The build is byte-identical to the ROM.', { timeout: 20_000 });
  await expect(project.getByRole('button', { name: 'inspect-mem', exact: true })).toBeVisible();
  await expect(editor.locator('.cm-content')).toContainText('Imported from inspect-mem.gb');
  await expect(editor.getByLabel('File')).toHaveValue('main.asm');

  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(1);
  const download = page.waitForEvent('download');
  await build.getByRole('button', { name: 'Export .gb' }).click();
  expect((await readFile(await (await download).path())).equals(original.buffer)).toBe(true);
});

test('keeps an invalid header as it is', async ({ page }) => {
  const { project } = await setup(page);
  await project.getByTestId('rom-import-file').setInputFiles(romFile('bad-logo'));
  await expect(project.getByTestId('rom-import')).toHaveText('Imported. The build is byte-identical to the ROM.', { timeout: 20_000 });
  await project.getByRole('button', { name: 'Settings' }).click();
  const toggle = project.getByRole('button', { name: 'Fix header with rgbfix' });
  for (let i = 0; i < 5 && (await toggle.count()) === 0; i++) await project.getByRole('button', { name: 'Next page' }).click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('the ZIP of an imported project holds source only and rebuilds', async ({ page }) => {
  const { project } = await setup(page);
  await project.getByTestId('rom-import-file').setInputFiles(romFile('marker'));
  await expect(project.getByTestId('rom-import')).toContainText('byte-identical', { timeout: 20_000 });
  const download = page.waitForEvent('download');
  await project.getByRole('button', { name: 'Export ZIP' }).click();
  const zip = await readFile(await (await download).path());
  expect(zip.includes('.gb')).toBe(false);
  expect(zip.includes('bank_000.asm')).toBe(true);
});

test('stays usable while importing a large ROM (SC-004)', async ({ page }) => {
  test.setTimeout(60_000);
  const { project, editor } = await setup(page);
  // A 1 MiB ROM generated here, with a valid-looking start; never stored in the repository.
  const buffer = Buffer.alloc(0x100000, 0x5a);
  await project.getByTestId('rom-import-file').setInputFiles({ name: 'large.gb', mimeType: 'application/octet-stream', buffer });
  await expect(project.getByRole('button', { name: 'large', exact: true })).toBeVisible({ timeout: 40_000 });
  await expect(project.getByTestId('rom-import')).toContainText('byte-identical');
  await expect(editor.getByLabel('File')).toHaveValue('main.asm');
});

test('normal ROMs still load directly in ROM Info', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('rom-file').setInputFiles(romFile('pattern'));
  await expect(page.getByTestId('run-state')).toHaveText('running');
});
