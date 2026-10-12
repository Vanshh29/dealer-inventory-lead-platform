// Regenerates docs/screenshots from the running stack:  pnpm --filter @dealer/e2e screenshots
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.env.WEB_URL ?? 'http://localhost:3000';
const out = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const shot = async (name, full = false) => {
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${out}${name}.png`, fullPage: full });
  console.log('saved', name);
};

await page.goto(`${base}/`);
await shot('home', true);

await page.goto(`${base}/vehicles?make=Volkswagen&fuel=DIESEL&sort=price_asc`);
await shot('catalog');

await page.locator('a[href^="/vehicles/"]').first().click();
await page.waitForURL(/\/vehicles\/[0-9a-f-]{36}/);
await shot('vehicle-detail', true);

await page.goto(`${base}/admin/login`);
await shot('login');
await page.getByLabel(/email/i).fill('sales@carvio.test');
await page.getByLabel(/password/i).fill('Passw0rd!Passw0rd!');
await page.getByRole('button', { name: /sign in|log in/i }).click();
await page.waitForURL(/\/admin(?!\/login)/);
await shot('dashboard');

await page.goto(`${base}/admin/leads`);
await page.getByRole('table').waitFor();
await shot('leads-table');

await page.getByRole('table').getByRole('link').first().click();
await page.waitForURL(/\/admin\/leads\/[0-9a-f-]{36}/);
await shot('lead-detail', true);

// Phone: the filters hide behind the three-line button.
const phone = await (
  await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
).newPage();
await phone.goto(`${base}/vehicles?fuel=DIESEL`);
await phone.waitForLoadState('networkidle');
await phone.screenshot({ path: `${out}mobile-catalog.png` });
await phone.getByRole('button', { name: /Filters/ }).tap();
await phone.waitForTimeout(500);
await phone.screenshot({ path: `${out}mobile-filters.png` });
console.log('saved mobile-catalog, mobile-filters');

await browser.close();
