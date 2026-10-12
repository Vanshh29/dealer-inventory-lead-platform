import { formatDate, formatDateTime } from './format';

describe('date formatting', () => {
  it('formats timestamps as dd.mm.yyyy, hh:mm so every lead view agrees', () => {
    expect(formatDateTime('2026-06-01T10:00:00.000Z')).toMatch(
      /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/,
    );
  });

  it('formats plain dates as dd.mm.yyyy', () => {
    expect(formatDate('2026-06-01T10:00:00.000Z')).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});

describe('formatHours', () => {
  it('shows minutes under an hour and hours otherwise', async () => {
    const { formatHours } = await import('./format');
    expect(formatHours(null)).toBe('—');
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(0.001)).toBe('1 min');
    expect(formatHours(13.44)).toBe('13.4 h');
  });
});
