import { SAFE_VOLUME_MAX, useSafeVolumeStore } from './safeVolumeStore';

describe('safe volume effective gain', () => {
  beforeEach(() => {
    useSafeVolumeStore.setState({
      enabledByChildId: { child_a: true, child_b: false },
      isLoaded: true,
    });
  });

  it('caps enabled child volume at 50 percent', () => {
    expect(useSafeVolumeStore.getState().getEffectiveVolume('child_a', 0.3)).toBe(0.3);
    expect(useSafeVolumeStore.getState().getEffectiveVolume('child_a', 0.8)).toBe(
      SAFE_VOLUME_MAX
    );
    expect(useSafeVolumeStore.getState().getEffectiveVolume('child_a', 1)).toBe(
      SAFE_VOLUME_MAX
    );
  });

  it('leaves disabled child volume unchanged', () => {
    expect(useSafeVolumeStore.getState().getEffectiveVolume('child_b', 0.8)).toBe(0.8);
    expect(useSafeVolumeStore.getState().getEffectiveVolume('child_b', 1)).toBe(1);
  });
});
