/**
 * How long the public pages may reuse API responses (Next.js data cache), in seconds.
 * Longer = fewer API calls, but a car you just unpublished or deleted stays visible that long.
 * 0 disables caching (used by the browser tests so they always see fresh data).
 */
const seconds = (name: string, fallback: number): number => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const catalogRevalidate = (): { next: { revalidate: number } } => ({
  next: { revalidate: seconds('CATALOG_REVALIDATE_SECONDS', 30) },
});
export const vehicleRevalidate = (): { next: { revalidate: number } } => ({
  next: { revalidate: seconds('CATALOG_REVALIDATE_SECONDS', 30) },
});
export const facetsRevalidate = (): { next: { revalidate: number } } => ({
  next: { revalidate: seconds('FACETS_REVALIDATE_SECONDS', 300) },
});
