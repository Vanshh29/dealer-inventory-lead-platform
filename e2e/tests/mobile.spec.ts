import AxeBuilder from '@axe-core/playwright';
import { test, expect, login } from './fixtures';

// iPhone-sized screen. Both the layout and the drawer behaviour are checked in a real browser.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const noSidewaysScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('phone layout', () => {
  test('filters hide behind the three-line button and slide in on tap', async ({ page }) => {
    await page.goto('/vehicles');
    const filters = page.getByRole('search', { name: 'Filter cars' });
    const opener = page.getByRole('button', { name: /Filters/ });

    await expect(opener).toBeVisible();
    await expect(filters).toBeHidden(); // not taking up the screen
    await expect(page.getByText(/\d+ cars? found/)).toBeVisible();

    await opener.tap();
    const dialog = page.getByRole('dialog', { name: 'Filters' });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Max. mileage (km)')).toBeVisible();

    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('applying a filter from the drawer filters the cars and shows the active count', async ({
    page,
  }) => {
    await page.goto('/vehicles');
    await page.getByRole('button', { name: /Filters/ }).tap();
    await page.getByLabel('Fuel').selectOption('ELECTRIC');
    await page.getByRole('button', { name: 'Show results' }).tap();
    await expect(page).toHaveURL(/fuel=ELECTRIC/);
    await expect(page.getByRole('dialog')).toBeHidden(); // new page, drawer closed
    await expect(page.getByRole('button', { name: /Filters 1 active/ })).toBeVisible();
    await expect(page.locator('main ul li').getByText('Electric').first()).toBeVisible();
  });

  test('pages fit the screen without sideways scrolling', async ({ page }) => {
    for (const path of ['/', '/vehicles', '/admin/login']) {
      await page.goto(path);
      expect(await noSidewaysScroll(page), path).toBe(true);
    }
    await page.goto('/vehicles');
    await page.locator('main ul a[href^="/vehicles/"]').first().tap();
    await page.getByRole('heading', { level: 1 }).waitFor();
    expect(await noSidewaysScroll(page), 'detail').toBe(true);
    // The price is near the top on a phone, not pushed down by a long description.
    const price = await page.getByText('Final price, including VAT').boundingBox();
    expect(price!.y).toBeLessThan(900);
  });

  test('back office tables show the important columns on a phone', async ({ page }) => {
    await login(page, 'sales@dealer.test');
    await page.goto('/admin/leads');
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    expect(await noSidewaysScroll(page), 'leads').toBe(true);
    // Status stays visible without scrolling the table sideways.
    const status = table.getByRole('columnheader', { name: 'Status' });
    const box = await status.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
