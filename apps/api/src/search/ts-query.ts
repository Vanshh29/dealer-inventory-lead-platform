/**
 * Turns free user text into a safe prefix tsquery string: "vw gol" -> "vw:* & gol:*".
 * Only letters and digits survive tokenisation, so none of to_tsquery's operators
 * (& | ! ( ) : * <->) can be injected. Capped to keep query cost bounded.
 */
export function toTsQuery(input: string): string | null {
  const tokens = input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8)
    .map((t) => t.slice(0, 40));
  return tokens.length > 0 ? tokens.map((t) => `${t}:*`).join(' & ') : null;
}
