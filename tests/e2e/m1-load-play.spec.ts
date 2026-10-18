import { expect, test } from '@playwright/test';
import { canvasColors, frameOf, loadRom, openApp } from './support.ts';

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

test('loads a ROM from the device and shows its picture', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(10);
  await expect.poll(async () => (await canvasColors(page)).length).toBeGreaterThan(1);
  await expect(page.getByTestId('run-state')).toHaveText('running');
});

test('reacts to two touch buttons pressed at the same time', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'input');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
  await expect.poll(() => canvasColors(page)).toEqual(['255,255,255']);

  const a = page.locator('[data-button="A"]');
  const b = page.locator('[data-button="B"]');
  await a.dispatchEvent('pointerdown', { pointerId: 11, isPrimary: true });
  await b.dispatchEvent('pointerdown', { pointerId: 12, isPrimary: false });
  await expect.poll(() => canvasColors(page)).toEqual(['0,0,0']);

  await b.dispatchEvent('pointerup', { pointerId: 12 });
  await expect.poll(() => canvasColors(page)).toEqual(['170,170,170']);
  await a.dispatchEvent('pointerup', { pointerId: 11 });
  await expect.poll(() => canvasColors(page)).toEqual(['255,255,255']);
});

test('starts the stored ROM after a reload without a file picker', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
  await page.reload();
  await expect(page.getByTestId('run-state')).toHaveText('empty');
  await page.getByRole('button', { name: 'Start stored ROM' }).click();
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
});

test('asks before replacing the stored ROM', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'pattern');
  await page.getByTestId('rom-file').setInputFiles({ name: 'x.gb', mimeType: 'application/octet-stream', buffer: Buffer.from('not a rom') });
  await expect(page.getByRole('alertdialog')).toContainText('Its save game will be lost');
  await page.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByRole('status')).toHaveText('This file is not a valid ROM.');
  await expect(page.getByTestId('run-state')).toHaveText('running');
});
