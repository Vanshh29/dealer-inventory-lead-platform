const HOUR_MS = 3_600_000;

export interface ResponseSummary {
  averageHours: number | null;
  medianHours: number | null;
  sampleSize: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Average and median hours between each lead's creation and first response (one decimal). */
export function summarizeResponseTimes(
  pairs: readonly { createdAt: Date; firstRespondedAt: Date }[],
): ResponseSummary {
  const hours = pairs
    .map((p) => Math.max(0, p.firstRespondedAt.getTime() - p.createdAt.getTime()) / HOUR_MS)
    .sort((a, b) => a - b);
  if (hours.length === 0) return { averageHours: null, medianHours: null, sampleSize: 0 };
  const mid = Math.floor(hours.length / 2);
  const median = hours.length % 2 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2;
  const average = hours.reduce((sum, h) => sum + h, 0) / hours.length;
  return { averageHours: round1(average), medianHours: round1(median), sampleSize: hours.length };
}
