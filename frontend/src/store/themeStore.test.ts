import { isDarkModeScheduled } from './themeStore';

describe('isDarkModeScheduled', () => {
  it('switches between the configured times using the device local clock', () => {
    expect(isDarkModeScheduled(new Date(2026, 0, 1, 19, 59), '20:00', '07:00')).toBe(false);
    expect(isDarkModeScheduled(new Date(2026, 0, 1, 20, 0), '20:00', '07:00')).toBe(true);
    expect(isDarkModeScheduled(new Date(2026, 0, 2, 6, 59), '20:00', '07:00')).toBe(true);
    expect(isDarkModeScheduled(new Date(2026, 0, 2, 7, 0), '20:00', '07:00')).toBe(false);
  });

  it('keeps invalid or identical schedule values in light mode', () => {
    const now = new Date(2026, 0, 1, 22, 0);

    expect(isDarkModeScheduled(now, 'invalid', '07:00')).toBe(false);
    expect(isDarkModeScheduled(now, '20:00', '20:00')).toBe(false);
  });
});
