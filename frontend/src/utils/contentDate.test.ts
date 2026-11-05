import { matchesContentDateFilter } from './contentDate';

describe('matchesContentDateFilter', () => {
  it('matches calendar dates using local date parts', () => {
    const createdAt = new Date(2026, 9, 20, 1, 30).toISOString();

    expect(
      matchesContentDateFilter(createdAt, {
        type: 'date',
        value: '2026-10-20',
      })
    ).toBe(true);
    expect(
      matchesContentDateFilter(createdAt, {
        type: 'date',
        value: '2026-10-19',
      })
    ).toBe(false);
  });

  it('matches month and year independently', () => {
    const createdAt = '2025-10-20T12:00:00.000Z';

    expect(
      matchesContentDateFilter(createdAt, { type: 'month', value: '9' })
    ).toBe(true);
    expect(
      matchesContentDateFilter(createdAt, { type: 'year', value: '2025' })
    ).toBe(true);
    expect(
      matchesContentDateFilter(createdAt, { type: 'year', value: '2026' })
    ).toBe(false);
  });

  it('does not match missing or invalid timestamps', () => {
    expect(
      matchesContentDateFilter(undefined, { type: 'year', value: '2026' })
    ).toBe(false);
    expect(
      matchesContentDateFilter('not-a-date', { type: 'year', value: '2026' })
    ).toBe(false);
  });
});
