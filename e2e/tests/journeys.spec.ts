import { request as apiRequest } from '@playwright/test';
import { test, expect, login, API_URL, PASSWORD } from './fixtures';

// One customer, one lead, followed through the whole system. Order matters.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const customer = { name: `E2E Customer ${stamp}`, email: `e2e.${stamp}@example.com` };

// Self-cleaning: remove vehicles this suite creates, even when a run failed half way.
test.afterAll(async () => {
  const api = await apiRequest.newContext({ baseURL: API_URL });
  await api.post('/auth/login', { data: { email: 'admin@dealer.test', password: PASSWORD } });
  const found = await (await api.get('/vehicles', { params: { q: 'E2E Octavia' } })).json();
  for (const v of found.items) await api.delete(`/admin/vehicles/${v.id}`);
  await api.dispose();
});

test.describe('public site', () => {
  test('browse, search and filter the catalog', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Find your next car' })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search cars' }).fill('golf');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/vehicles\?q=golf/);
    await expect(page.getByText(/\d+ cars? found/)).toBeVisible();
    const cards = page.getByRole('list').getByRole('heading', { level: 3 });
    await expect(cards.first()).toContainText(/golf/i);

    // facets: pick a fuel + sort, results and URL follow
    await page.getByLabel('Fuel').selectOption('DIESEL');
    await page.getByLabel('Sort by').selectOption('price_asc');
    await page.getByRole('button', { name: 'Show results' }).click();
    await expect(page).toHaveURL(/fuel=DIESEL/);
    await expect(page).toHaveURL(/sort=price_asc/);
    // form keeps the chosen values (state lives in the URL)
    await expect(page.getByLabel('Fuel')).toHaveValue('DIESEL');

    // nothing found -> helpful empty state with a way out
    await page.goto('/vehicles?q=zzzznothing');
    await expect(page.getByRole('heading', { name: 'No cars match your search' })).toBeVisible();
    await page.getByRole('link', { name: 'Clear all filters' }).click();
    await expect(page).toHaveURL(/\/vehicles$/);

    // pagination
    await expect(page.getByRole('navigation', { name: 'Pagination' })).toBeVisible();
    await page.getByRole('link', { name: /Next/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
  });

  test('vehicle detail with gallery, and 404 for unknown cars', async ({ page, watch }) => {
    await page.goto('/vehicles?q=golf'); // seeded cars have three photos each
    await page.getByRole('list').getByRole('link').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/€/).first()).toBeVisible();

    const gallery = page.getByRole('region', { name: /Photos of/ });
    await expect(gallery.getByRole('img').first()).toHaveAttribute('alt', /photo 1 of 3/);
    await gallery.getByRole('button', { name: 'Next photo' }).click();
    await expect(gallery.getByRole('img').first()).toHaveAttribute('alt', /photo 2 of 3/);

    watch.allow(/^404 GET .*\/vehicles\/00000000-0000-4000-8000-000000000000$/); // provoked on purpose
    const res = await page.goto('/vehicles/00000000-0000-4000-8000-000000000000');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('submit a lead: validation first, then success', async ({ page }) => {
    await page.goto('/vehicles?q=golf');
    await page.getByRole('list').getByRole('link').first().click();

    const form = page.getByRole('form', { name: /Interested/ });
    await form.getByRole('button', { name: 'Send request' }).click();
    await expect(form.getByText('Please enter your name.')).toBeVisible();
    await expect(form.getByText('Please enter a valid email address.')).toBeVisible();
    await expect(form.getByLabel('Name')).toBeFocused();

    await form.getByLabel('Name').fill(customer.name);
    await form.getByLabel('Email').fill(customer.email);
    await form.getByLabel(/Phone/).fill('+49 170 1234567');
    await form.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('status')).toContainText('Thank you');
  });
});

test.describe('back office', () => {
  test('anonymous visitors are sent to login; wrong password is rejected generically', async ({
    page,
    watch,
  }) => {
    watch.allow(/^401 POST .*\/auth\/login$/); // the wrong password below, provoked on purpose
    await page.goto('/admin/leads');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fleads/);

    await login(page, 'sales@dealer.test', 'wrong-password!!', { expectSuccess: false });
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid' })).toHaveText(
      'Invalid email or password.',
    );
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('sales works the new lead through the pipeline', async ({ page }) => {
    await login(page, 'sales@dealer.test');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('SALES', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Leads' }).click();
    await page.getByRole('searchbox', { name: 'Search by name or email' }).fill(customer.email);
    await page.getByRole('button', { name: 'Search' }).click();
    const row = page.getByRole('row', { name: new RegExp(customer.name) });
    await expect(row.getByText('New')).toBeVisible();
    await row.getByRole('link', { name: customer.name }).click();

    // from NEW only CONTACTED and LOST are valid; WON is not even offered
    await expect(page.getByRole('heading', { name: customer.name })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark as Contacted' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark as Lost' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark as Won' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Mark as Contacted' }).click();
    await expect(page.getByRole('button', { name: 'Mark as Test drive' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark as Contacted' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Assign to me' }).click();
    await expect(page.getByText('sales@dealer.test').first()).toBeVisible();

    await page.getByLabel('Add a note').fill('Called the customer, test drive on Saturday.');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText('Called the customer, test drive on Saturday.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Notes (1)' })).toBeVisible();

    await page.getByRole('button', { name: 'Mark as Test drive' }).click();
    await page.getByRole('button', { name: 'Mark as Offer' }).click();
    page.once('dialog', (d) => d.accept()); // final status asks for confirmation
    await page.getByRole('button', { name: 'Mark as Won' }).click();
    await expect(page.getByText(/closed \(Won\)/)).toBeVisible();

    // the list reflects it
    await page.goto(`/admin/leads?status=WON&q=${encodeURIComponent(customer.email)}`);
    await expect(
      page.getByRole('row', { name: new RegExp(customer.name) }).getByText('Won'),
    ).toBeVisible();
  });

  test('admin sees the audit history of that lead', async ({ page }) => {
    await login(page, 'admin@dealer.test');
    await page.goto(`/admin/leads?q=${encodeURIComponent(customer.email)}`);
    await page.getByRole('link', { name: customer.name }).click();
    const history = page.getByRole('region', { name: 'History' });
    await expect(history.getByText('Lead received from the website')).toBeVisible();
    await expect(history.getByText(/Status New → Contacted by sales@dealer\.test/)).toBeVisible();
    await expect(history.getByText(/Status Offer → Won by sales@dealer\.test/)).toBeVisible();
  });

  test('viewer is read-only: no actions on leads, no "Add vehicle"', async ({ page, watch }) => {
    watch.allow(/^40[13] POST .*\/admin\/vehicles$/); // direct API call that must be refused
    await login(page, 'viewer@dealer.test');
    await page.goto(`/admin/leads?q=${encodeURIComponent(customer.email)}`);
    await page.getByRole('link', { name: customer.name }).click();
    await expect(page.getByText(/read-only access/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Mark as/ })).toHaveCount(0);
    await expect(page.getByLabel('Add a note')).toHaveCount(0);

    await page.getByRole('link', { name: 'Vehicles' }).click();
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add vehicle' })).toHaveCount(0);

    // and the server says no even if someone bypasses the UI
    const res = await page.request.post('http://localhost:4000/admin/vehicles', { data: {} });
    expect([401, 403]).toContain(res.status());
  });

  test('admin creates, edits, photographs and deletes a vehicle', async ({ page }) => {
    await login(page, 'admin@dealer.test');
    await page.getByRole('link', { name: 'Vehicles' }).click();
    await page.getByRole('link', { name: 'Add vehicle' }).click();

    await page.getByRole('button', { name: 'Create vehicle' }).click();
    await expect(page.getByText(/17 characters/)).toBeVisible(); // client-side validation

    const vin = `E2E${String(stamp).slice(-8)}ZZ`
      .slice(0, 17)
      .padEnd(17, 'Z')
      .replace(/[IOQ]/g, 'X');
    await page.getByLabel('VIN').fill(vin);
    await page.getByLabel('Colour').fill('Green');
    await page.getByLabel('Make', { exact: true }).fill('Skoda');
    await page.getByLabel('Model', { exact: true }).fill('E2E Octavia');
    await page.getByLabel('Mileage (km)').fill('12345');
    await page.getByLabel('Price (€)').fill('15.999,90');
    await page.getByLabel('Status').selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Create vehicle' }).click();

    await expect(page.getByRole('heading', { name: 'Skoda E2E Octavia' })).toBeVisible();
    await expect(page.getByLabel('Price (€)')).toHaveValue('15999.90');

    await page.getByLabel('Price (€)').fill('14500');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();

    // photo upload (PNG signature is checked server-side)
    await page.getByLabel(/Add photos/).setInputFiles({
      name: 'car.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await expect(page.getByRole('heading', { name: 'Photos (1/10)' })).toBeVisible();

    // it is now on the public site
    await page.goto('/vehicles?q=E2E+Octavia');
    await expect(page.getByRole('heading', { level: 3, name: 'Skoda E2E Octavia' })).toBeVisible();
    await expect(page.getByText(/14\.500,00\s€/)).toBeVisible();

    // delete
    await page.goto('/admin/vehicles');
    await page.getByRole('link', { name: 'Skoda E2E Octavia' }).click();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Delete vehicle' }).click();
    await expect(page).toHaveURL(/\/admin\/vehicles$/);
    await page.goto('/vehicles?q=E2E+Octavia');
    await expect(page.getByRole('heading', { name: 'No cars match your search' })).toBeVisible();
  });

  test('logging out ends the session', async ({ page }) => {
    await login(page, 'sales@dealer.test');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin/leads');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
