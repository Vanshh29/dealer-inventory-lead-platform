import { summarizeResponseTimes } from './response-time';

const at = (h: number) => new Date(Date.UTC(2026, 0, 1) + h * 3_600_000);
const pair = (hours: number) => ({ createdAt: at(0), firstRespondedAt: at(hours) });

describe('summarizeResponseTimes', () => {
  it('returns nulls when nobody has been answered', () => {
    expect(summarizeResponseTimes([])).toEqual({
      averageHours: null,
      medianHours: null,
      sampleSize: 0,
    });
  });

  it('computes average and median (odd count)', () => {
    expect(summarizeResponseTimes([pair(1), pair(2), pair(9)])).toEqual({
      averageHours: 4,
      medianHours: 2,
      sampleSize: 3,
    });
  });

  it('averages the two middle values for an even count and rounds to one decimal', () => {
    const r = summarizeResponseTimes([pair(1), pair(2), pair(3), pair(4.55)]);
    expect(r.medianHours).toBe(2.5);
    expect(r.averageHours).toBe(2.6);
  });

  it('never reports negative durations', () => {
    expect(summarizeResponseTimes([{ createdAt: at(5), firstRespondedAt: at(4) }])).toMatchObject({
      averageHours: 0,
    });
  });
});
