/** @jest-environment node */
import { assetUrl, PUBLIC_API_URL } from './index';

describe('assetUrl', () => {
  it('prefixes API-relative upload paths with the public API origin', () => {
    expect(assetUrl('/uploads/a.png')).toBe(`${PUBLIC_API_URL}/uploads/a.png`);
  });
  it('leaves absolute URLs (seed placeholders) alone', () => {
    expect(assetUrl('https://placehold.co/800x600/png')).toBe('https://placehold.co/800x600/png');
  });
});
