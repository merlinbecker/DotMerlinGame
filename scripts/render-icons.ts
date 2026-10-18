// Renders public/icons/logo.svg to the PNG sizes the manifest needs. Run once after changing the logo:
//   node scripts/render-icons.ts
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('public/icons/logo.svg', 'utf8');
const browser = await chromium.launch();
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.screenshot({ path: `public/icons/icon-${size}.png`, omitBackground: false });
    await page.close();
  }
} finally {
  await browser.close();
}
