import { expect, test } from '@playwright/test';
import { canvasColors, frameOf, loadRom, openApp, romFile, romInfoPage } from './support.ts';

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

test('starts the stored ROM after the browser closed the storage connection in the background', async ({ page }) => {
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    const connections: IDBDatabase[] = [];
    Object.assign(window, { closeStorage: () => { for (const db of connections) db.close(); } });
    indexedDB.open = (...args) => {
      const req = open(...args);
      req.addEventListener('success', () => connections.push(req.result));
      return req;
    };
  });
  await openApp(page);
  await loadRom(page, 'pattern');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
  await page.reload();
  await expect(page.getByTestId('run-state')).toHaveText('empty');
  await page.evaluate(() => { (window as unknown as { closeStorage(): void }).closeStorage(); });
  await page.getByRole('button', { name: 'Start stored ROM' }).click();
  await expect(page.getByTestId('run-state')).toHaveText('running');
});

test('runs a good ROM loaded after a halted one', async ({ page }) => {
  await openApp(page);
  await romInfoPage(page, 'Start');
  await page.getByRole('button', { name: 'Hardware-near checks' }).click();
  await romInfoPage(page, 'ROM');
  await loadRom(page, 'bad-logo');
  await expect(page.getByTestId('run-state')).toHaveText('halted', { timeout: 10_000 });
  await page.getByTestId('rom-file').setInputFiles(romFile('pattern'));
  await page.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByTestId('run-state')).toHaveText('running');
  await expect(page.getByRole('status')).toHaveCount(0);
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

test('replaces and restarts ROMs on a touch screen (phone)', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  await openApp(page);
  await page.locator('[data-view="memory-map"]').tap({ position: { x: 20, y: 200 } }); // first tap: sound
  await loadRom(page, 'pattern');
  await expect(page.getByTestId('run-state')).toHaveText('running');
  await page.getByTestId('rom-file').setInputFiles(romFile('input'));
  await page.getByRole('button', { name: 'Replace' }).tap();
  await expect(page.locator('[data-view="rom-info"]')).toContainText('input.gb');
  await page.reload();
  await page.getByRole('button', { name: 'Start stored ROM' }).tap();
  await expect(page.getByTestId('run-state')).toHaveText('running');
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
  await context.close();
});

test('plays with the keyboard (J = A, K = B) even when the controller view is not shown (FR-006)', async ({ page }) => {
  await openApp(page);
  await loadRom(page, 'input');
  await expect.poll(() => canvasColors(page)).toEqual(['255,255,255']);
  const controller = page.locator('[data-view="controller"]');
  await controller.getByRole('button', { name: 'Next view' }).click(); // controller view gone
  await expect(page.locator('[data-view="controller"]')).toHaveCount(0);
  await page.locator('body').click({ position: { x: 5, y: 5 } }); // focus away from buttons
  await page.keyboard.down('KeyJ');
  await page.keyboard.down('KeyK');
  await expect.poll(() => canvasColors(page)).toEqual(['0,0,0']);
  await page.keyboard.up('KeyK');
  await expect.poll(() => canvasColors(page)).toEqual(['170,170,170']);
  await page.keyboard.up('KeyJ');
  await expect.poll(() => canvasColors(page)).toEqual(['255,255,255']);
});

test('shows connected game controllers in ROM Info (FR-006)', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = { id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
    (window as unknown as { testPad: typeof pad }).testPad = pad;
  });
  await openApp(page);
  await page.evaluate(() => window.dispatchEvent(new Event('gamepadconnected')));
  await expect(page.getByTestId('gamepads')).toHaveText('Test Pad (STANDARD GAMEPAD)');
  await loadRom(page, 'input');
  await expect.poll(() => canvasColors(page)).toEqual(['255,255,255']);
  const setButton = (index: number, pressed: boolean) =>
    page.evaluate(
      ([i, p]) => {
        const pad = (window as unknown as { testPad: { buttons: { pressed: boolean }[] } }).testPad;
        const button = pad.buttons[i as number];
        if (button) button.pressed = p as boolean;
      },
      [index, pressed],
    );
  await setButton(1, true); // right face button = A
  await expect.poll(() => canvasColors(page)).toEqual(['170,170,170']);
  await setButton(1, false);
  await expect.poll(() => canvasColors(page)).toEqual(['255,255,255']);
});
