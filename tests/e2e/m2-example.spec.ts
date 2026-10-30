import { expect, test } from '@playwright/test';
import { frameOf, openApp, switchTo } from './support.ts';

test('starts with nothing: example, build, run (US4-AS1)', async ({ page }) => {
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
  await openApp(page);
  const slots = page.locator('[data-testid="slot"]');
  const editor = slots.nth(3);
  await switchTo(editor, 'editor');
  await expect(editor.getByRole('status')).toContainText('Project view');
  const project = slots.nth(2);
  await switchTo(project, 'project');
  await expect(project.getByText('No projects yet.')).toBeVisible();
  await project.getByRole('button', { name: 'New: hello' }).click();
  await editor.getByRole('button', { name: 'Build' }).click();
  await expect.poll(() => frameOf(page)).toBeGreaterThan(5);
});
