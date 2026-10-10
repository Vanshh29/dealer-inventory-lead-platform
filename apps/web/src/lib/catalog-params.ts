import { CATALOG_SORTS, FUEL_TYPES, GEARBOXES } from '@dealer/shared';
import type { CatalogParams } from '@dealer/shared';
import { eurosToCents } from './money';

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** The catalog's state lives in the URL (shareable, back-button friendly, works without JS). */
export const STATE_KEYS = [
  'q',
  'make',
  'model',
  'fuel',
  'gearbox',
  'minPrice',
  'maxPrice',
  'minYear',
  'maxYear',
  'maxKm',
  'sort',
] as const;
export type CatalogState = Partial<Record<(typeof STATE_KEYS)[number], string>>;

export const PAGE_SIZE = 12;

const first = (v: string | string[] | undefined): string | undefined =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

const int = (v: string | undefined, min: number, max: number): number | undefined => {
  if (!v || !/^\d{1,9}$/.test(v)) return undefined;
  const n = Number(v);
  return n >= min && n <= max ? n : undefined;
};

/**
 * Turns untrusted query-string input into (a) API params and (b) the cleaned state used to refill
 * the form. Invalid values are dropped, never forwarded.
 */
export function parseCatalogSearch(raw: RawSearchParams): {
  params: CatalogParams;
  state: CatalogState;
  page: number;
} {
  const state: CatalogState = {};
  const params: CatalogParams = { limit: PAGE_SIZE };

  const q = first(raw.q)?.slice(0, 100);
  if (q) {
    params.q = q;
    state.q = q;
  }
  const make = first(raw.make);
  if (make) {
    params.make = make;
    state.make = make;
  }
  const model = first(raw.model);
  if (model) {
    params.model = model;
    state.model = model;
  }

  const fuel = first(raw.fuel);
  if (fuel && (FUEL_TYPES as readonly string[]).includes(fuel)) {
    params.fuel = fuel as CatalogParams['fuel'];
    state.fuel = fuel;
  }
  const gearbox = first(raw.gearbox);
  if (gearbox && (GEARBOXES as readonly string[]).includes(gearbox)) {
    params.gearbox = gearbox as CatalogParams['gearbox'];
    state.gearbox = gearbox;
  }
  const sort = first(raw.sort);
  if (sort && (CATALOG_SORTS as readonly string[]).includes(sort)) {
    params.sort = sort as CatalogParams['sort'];
    state.sort = sort;
  }

  const minPrice = first(raw.minPrice);
  const minCents = minPrice ? eurosToCents(minPrice) : null;
  if (minPrice && minCents !== null) {
    params.priceMin = minCents;
    state.minPrice = minPrice;
  }
  const maxPrice = first(raw.maxPrice);
  const maxCents = maxPrice ? eurosToCents(maxPrice) : null;
  if (maxPrice && maxCents !== null) {
    params.priceMax = maxCents;
    state.maxPrice = maxPrice;
  }

  const minYear = int(first(raw.minYear), 1950, 2100);
  if (minYear !== undefined) {
    params.yearMin = minYear;
    state.minYear = String(minYear);
  }
  const maxYear = int(first(raw.maxYear), 1950, 2100);
  if (maxYear !== undefined) {
    params.yearMax = maxYear;
    state.maxYear = String(maxYear);
  }
  const maxKm = int(first(raw.maxKm), 0, 2_000_000);
  if (maxKm !== undefined) {
    params.mileageMax = maxKm;
    state.maxKm = String(maxKm);
  }

  // Contradictory ranges would be a 400 from the API; show "no results" instead of an error page.
  if (
    params.priceMin !== undefined &&
    params.priceMax !== undefined &&
    params.priceMin > params.priceMax
  ) {
    [params.priceMin, params.priceMax] = [params.priceMax, params.priceMin];
  }
  if (
    params.yearMin !== undefined &&
    params.yearMax !== undefined &&
    params.yearMin > params.yearMax
  ) {
    [params.yearMin, params.yearMax] = [params.yearMax, params.yearMin];
  }

  const page = int(first(raw.page), 1, 100_000) ?? 1;
  params.page = page;
  return { params, state, page };
}

export function catalogHref(state: CatalogState, page = 1, basePath = '/vehicles'): string {
  const qs = new URLSearchParams();
  for (const key of STATE_KEYS) if (state[key]) qs.set(key, state[key]!);
  if (page > 1) qs.set('page', String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
