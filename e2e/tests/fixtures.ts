import { test as base, expect, type Page } from '@playwright/test';

export const API_URL = process.env.API_URL ?? 'http://localhost:4000';
export const PASSWORD = 'Passw0rd!Passw0rd!';

// 1x1 transparent PNG
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export interface Watch {
  /** Everything unexpected the browser reported so far; every test must end with this empty. */
  problems: string[];
  /** Declare an HTTP error this test provokes on purpose, matched against "<status> <METHOD> <url>". */
  allow: (pattern: RegExp) => void;
}

/**
 * Every test fails on browser console errors, uncaught exceptions, failed requests and unexpected
 * HTTP error responses, so "works without console errors" is enforced, not hoped for.
 *
 * Chrome logs every 4xx as a console error *without the URL*, so HTTP errors are tracked through
 * response events instead (with URL), and a test declares the ones it expects via `allow()`.
 * The only globally tolerated one is the session probe: the back office asks GET /auth/me on load
 * and a logged-out visitor legitimately gets 401.
 */
export const test = base.extend<{ watch: Watch }>({
  watch: [
    async ({ page }, use) => {
      const problems: string[] = [];
      const allowed: RegExp[] = [/^401 GET .*\/auth\/me$/];

      // Third-party placeholder images are stubbed: deterministic and works offline.
      await page.route('https://placehold.co/**', (route) =>
        route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
      );
      page.on('console', (m) => {
        // "Failed to load resource" lines carry no URL; they are covered by the response listener.
        if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
          problems.push(`console.error: ${m.text()}`);
        }
      });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) => {
        const reason = r.failure()?.errorText ?? '';
        // ERR_ABORTED = the browser cancelled it itself (e.g. a link prefetch when navigating away).
        if (reason !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()} ${reason}`);
      });
      page.on('response', (r) => {
        if (r.status() < 400) return;
        const line = `${r.status()} ${r.request().method()} ${r.url()}`;
        if (!allowed.some((p) => p.test(line))) problems.push(`http error: ${line}`);
      });

      await use({ problems, allow: (p) => allowed.push(p) });
      expect(problems, 'unexpected browser errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Signs in and, by default, waits until the redirect into the back office has happened. */
export async function login(
  page: Page,
  email: string,
  password = PASSWORD,
  { expectSuccess = true }: { expectSuccess?: boolean } = {},
) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  if (expectSuccess) await page.waitForURL((url) => !url.pathname.endsWith('/admin/login'));
}
