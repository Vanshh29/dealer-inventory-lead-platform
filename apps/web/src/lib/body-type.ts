export type BodyType = 'hatch' | 'sedan' | 'wagon' | 'suv';

const BY_MODEL: Record<string, BodyType> = {
  '320d': 'sedan',
  'c 220 d': 'sedan',
  a4: 'sedan',
  i4: 'sedan',
  'model 3': 'sedan',
  focus: 'wagon',
  i30: 'wagon',
  octavia: 'wagon',
  passat: 'wagon',
  'e-tron': 'suv',
  enyaq: 'suv',
  'glc 300': 'suv',
  'ioniq 5': 'suv',
  kuga: 'suv',
  q3: 'suv',
  tiguan: 'suv',
  x3: 'suv',
};

/** The seed has no body-type column, so the silhouette is derived from the model (or variant name). */
export function bodyTypeOf(v: { model?: string; variant?: string | null }): BodyType {
  const variant = (v.variant ?? '').toLowerCase();
  if (/\b(variant|touring|combi|estate|sportswagon)\b/.test(variant)) return 'wagon';
  return BY_MODEL[(v.model ?? '').toLowerCase()] ?? 'hatch';
}
