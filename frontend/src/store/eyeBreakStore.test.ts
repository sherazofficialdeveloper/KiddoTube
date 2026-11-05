import {
  EYE_BREAK_INTERVAL_SECONDS,
  useEyeBreakStore,
} from './eyeBreakStore';

describe('eye break timer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useEyeBreakStore.getState().reset();
  });

  afterEach(() => {
    useEyeBreakStore.getState().reset();
    jest.useRealTimers();
  });

  it('counts only active watching time and shows one reminder at 20 minutes', () => {
    useEyeBreakStore.getState().setWatching(true);
    jest.advanceTimersByTime(10_000);
    useEyeBreakStore.getState().setWatching(false);
    jest.advanceTimersByTime(30_000);

    expect(useEyeBreakStore.getState().accumulatedSeconds).toBe(10);
    expect(useEyeBreakStore.getState().reminderVisible).toBe(false);

    useEyeBreakStore.getState().setWatching(true);
    jest.advanceTimersByTime((EYE_BREAK_INTERVAL_SECONDS - 10) * 1000);

    expect(useEyeBreakStore.getState().reminderVisible).toBe(true);
    expect(useEyeBreakStore.getState().activeWatching).toBe(false);
  });

  it('starts a fresh interval after the reminder is acknowledged', () => {
    useEyeBreakStore.getState().setWatching(true);
    jest.advanceTimersByTime(EYE_BREAK_INTERVAL_SECONDS * 1000);
    useEyeBreakStore.getState().acknowledgeReminder();

    expect(useEyeBreakStore.getState().accumulatedSeconds).toBe(0);
    expect(useEyeBreakStore.getState().reminderVisible).toBe(false);

    useEyeBreakStore.getState().setWatching(true);
    jest.advanceTimersByTime(1000);
    expect(useEyeBreakStore.getState().accumulatedSeconds).toBe(1);
  });
});
