interface RangeParams {
  priceMin?: number | null;
  priceMax?: number | null;
  yearMin?: number | null;
  yearMax?: number | null;
}

/** One message per inverted min/max pair; empty when the ranges are consistent. */
export function invertedRanges(p: RangeParams): string[] {
  const out: string[] = [];
  const inverted = (min?: number | null, max?: number | null) =>
    min != null && max != null && min > max;
  if (inverted(p.priceMin, p.priceMax)) out.push('priceMin must not exceed priceMax');
  if (inverted(p.yearMin, p.yearMax)) out.push('yearMin must not exceed yearMax');
  return out;
}
