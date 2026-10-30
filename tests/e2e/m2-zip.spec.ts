import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
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

const SOURCE = 'SECTION "H",ROM0[$100]\nnop\njp $150\nds $150-@,0\nSECTION "M",ROM0[$150]\nloop: jr loop\n';

test('keeps changes over a reload and a view switch (US3-AS1, spec edge case)', async ({ page }) => {
  const { editor } = await openProjectFromExample(page);
  await replaceSource(editor, SOURCE);
  await expect(editor.getByTestId('save-state')).toHaveText('Saved', { timeout: 5000 });

  await editor.getByRole('button', { name: 'Next view' }).click();
  await editor.getByRole('button', { name: 'Previous view' }).click();
  await expect(editor.locator('.cm-content')).toContainText('loop: jr loop');

  await page.reload();
  await expect(editor.locator('.cm-content')).toContainText('loop: jr loop');
});

test('saves at once when the page goes away, before the delay', async ({ page }) => {
  const { editor } = await openProjectFromExample(page);
  await replaceSource(editor, SOURCE);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(editor.getByTestId('save-state')).toHaveText('Saved');
});

test('ZIP export, delete and import give a byte-identical build (US3-AS2, SC-002)', async ({ page }) => {
  const { editor, build, project } = await openProjectFromExample(page);
  const romOf = async () => {
    await editor.getByRole('button', { name: 'Build' }).click();
    await expect(build.getByTestId('build-status')).toContainText('Built in');
    const download = page.waitForEvent('download');
    await build.getByRole('button', { name: 'Export .gb' }).click();
    return readFile(await (await download).path());
  };
  const before = await romOf();

  const zipDownload = page.waitForEvent('download');
  await project.getByRole('button', { name: 'Export ZIP' }).click();
  const zip = await zipDownload;
  expect(zip.suggestedFilename()).toBe('hello.zip');
  const zipBytes = await readFile(await zip.path());

  await project.getByRole('button', { name: 'Delete hello' }).click();
  await project.getByRole('button', { name: 'Delete' }).click();
  await expect(project.getByText('No projects yet.')).toBeVisible();

  await project.getByTestId('zip-file').setInputFiles({ name: 'hello.zip', mimeType: 'application/zip', buffer: zipBytes });
  await expect(project.getByTestId('project-row')).toHaveCount(1);
  await expect(editor.locator('.cm-content')).toContainText('A first program');
  expect((await romOf()).equals(before)).toBe(true);
});

test('asks when the name exists; a copy gets its own entry (US3-AS4)', async ({ page }) => {
  const { project } = await openProjectFromExample(page);
  const download = page.waitForEvent('download');
  await project.getByRole('button', { name: 'Export ZIP' }).click();
  const zipBytes = await readFile(await (await download).path());
  await project.getByTestId('zip-file').setInputFiles({ name: 'hello.zip', mimeType: 'application/zip', buffer: zipBytes });
  await expect(project.getByRole('alertdialog')).toContainText('already exists');
  await project.getByRole('button', { name: 'Keep as copy' }).click();
  await expect(project.getByTestId('project-row')).toHaveCount(2);
  await expect(project.getByRole('button', { name: 'hello copy', exact: true })).toBeVisible();
});

test('rejects an invalid archive and changes nothing (US3-AS3)', async ({ page }) => {
  const { project } = await openProjectFromExample(page);
  await project.getByTestId('zip-file').setInputFiles({ name: 'x.zip', mimeType: 'application/zip', buffer: Buffer.from('not a zip') });
  await expect(project.getByRole('status')).toHaveText('This file is not a valid ZIP archive.');
  await expect(project.getByTestId('project-row')).toHaveCount(1);
});
