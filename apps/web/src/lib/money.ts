/**
 * Money is integer cents everywhere. These helpers convert to and from what a person types,
 * using string arithmetic only: "19999.90" never passes through a float.
 */

/** "19999", "19.999,50", "19999.5" -> cents, or null if it is not a valid amount. */
export function eurosToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[\s€]/g, '');
  // German style "19.999,50" (dot = thousands, comma = decimals) or plain "19999.50"
  const normalised = /,/.test(cleaned) ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(normalised);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(cents) ? cents : null;
}

/** 1999050 -> "19990.50"; whole euros stay whole: 1500000 -> "15000". */
export function centsToEuroInput(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const frac = cents % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`;
}
