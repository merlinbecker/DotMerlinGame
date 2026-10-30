import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { computeHeaderChecksum, logoMatches } from '../../src/core/index.ts';
import { openProjectFromExample, replaceSource } from './support.ts';

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

test('exports a .gb with a valid logo and checksum (US2, FR-006)', async ({ page }) => {
  const { editor, build } = await openProjectFromExample(page);
  await expect(build.getByRole('button', { name: 'Export .gb' })).toBeDisabled();
  await expect(build.getByTestId('export-blocked')).toHaveText('Build first.');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toContainText('Built in');
  const download = page.waitForEvent('download');
  await build.getByRole('button', { name: 'Export .gb' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('hello.gb');
  const rom = new Uint8Array(await readFile(await file.path()));
  expect(await logoMatches(rom)).toBe(true);
  expect(rom[0x14d]).toBe(computeHeaderChecksum(rom));
});

test('export is blocked after a failed build and says why (US2-AS3)', async ({ page }) => {
  const { editor, build } = await openProjectFromExample(page);
  await replaceSource(editor, 'bogus\n');
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect(build.getByTestId('build-status')).toHaveText('Build failed');
  await expect(build.getByRole('button', { name: 'Export .gb' })).toBeDisabled();
  await expect(build.getByTestId('export-blocked')).toHaveText('The last build failed.');
});
