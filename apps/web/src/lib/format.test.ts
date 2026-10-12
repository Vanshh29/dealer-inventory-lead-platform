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
