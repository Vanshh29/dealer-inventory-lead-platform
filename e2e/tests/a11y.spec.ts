import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, login } from './fixtures';

/** Automated WCAG 2.0/2.1/2.2 A+AA checks on the pages a visitor or staff member actually uses. */
async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
}

test.describe('accessibility (axe)', () => {
  test('canary: the checker really does catch defects', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><button style="color:#ccc;background:#fff">low contrast</button><input type="text">',
      );
    });
    const rules = (await violations(page)).map((v) => v.rule);
    expect(rules).toEqual(expect.arrayContaining(['image-alt', 'label']));
  });

  test('public pages', async ({ page }) => {
    for (const path of [
      '/',
      '/vehicles',
      '/vehicles?q=golf&fuel=DIESEL',
      '/vehicles?q=zzzznothing',
    ]) {
      await page.goto(path);
      await page.getByRole('main').waitFor();
      expect(await violations(page), path).toEqual([]);
    }
  });

  test('vehicle detail with gallery and lead form (including validation errors)', async ({
    page,
  }) => {
    await page.goto('/vehicles?q=golf');
    await page.locator('main ul a[href^="/vehicles/"]').first().click();
    await page.getByRole('heading', { level: 1 }).waitFor();
    expect(await violations(page), 'detail').toEqual([]);

    await page.getByRole('button', { name: 'Send request' }).click();
    await page.getByText('Please enter your name.').waitFor();
    expect(await violations(page), 'detail with errors').toEqual([]);
  });

  test('back office pages', async ({ page }) => {
    await page.goto('/admin/login');
    expect(await violations(page), 'login').toEqual([]);

    await login(page, 'admin@carvio.test');
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
    expect(await violations(page), 'dashboard').toEqual([]);

    await page.goto('/admin/leads');
    await page.getByRole('table').waitFor();
    expect(await violations(page), 'leads table').toEqual([]);

    await page.getByRole('table').getByRole('link').first().click();
    await page.getByRole('heading', { name: 'Notes', exact: false }).waitFor();
    expect(await violations(page), 'lead detail').toEqual([]);

    await page.goto('/admin/vehicles');
    await page.getByRole('table').waitFor();
    expect(await violations(page), 'vehicles table').toEqual([]);

    await page.getByRole('table').getByRole('link').first().click();
    await page.getByLabel('VIN').waitFor();
    expect(await violations(page), 'vehicle editor').toEqual([]);
  });
});
