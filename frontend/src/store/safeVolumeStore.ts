import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { setNativeSafeVolumeEnabled } from '../utils/safeVolumeNative';

export const SAFE_VOLUME_MAX = 0.5;
export const SAFE_VOLUME_MAX_PERCENT = SAFE_VOLUME_MAX * 100;

const STORAGE_KEY = '@kiddotube_safe_volume_by_child';

interface SafeVolumeState {
  enabledByChildId: Record<string, boolean>;
  isLoaded: boolean;
  load: () => Promise<void>;
  isEnabled: (childId: string | null | undefined) => boolean;
  setEnabled: (childId: string | null | undefined, enabled: boolean) => Promise<boolean>;
  remove: (childId: string | null | undefined) => Promise<void>;
  getEffectiveVolume: (
    childId: string | null | undefined,
    requestedVolume: number
  ) => number;
}

export const useSafeVolumeStore = create<SafeVolumeState>((set, get) => ({
  enabledByChildId: {},
  isLoaded: false,

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const enabledByChildId = Object.entries(parsed).reduce<Record<string, boolean>>(
          (result, [childId, enabled]) => {
            if (typeof enabled === 'boolean') result[childId] = enabled;
            return result;
          },
          {}
        );
        set({ enabledByChildId, isLoaded: true });
        return;
      }
    } catch (error) {
      console.warn('[SafeVolumeStore] Failed to load settings:', error);
    }
    set({ isLoaded: true });
  },

  isEnabled: (childId) =>
    childId ? get().enabledByChildId[String(childId)] === true : false,

  setEnabled: async (childId, enabled) => {
    if (!childId) return false;
    const key = String(childId);
    const next = { ...get().enabledByChildId, [key]: enabled };
    set({ enabledByChildId: next });
    setNativeSafeVolumeEnabled(enabled);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch (error) {
      console.warn('[SafeVolumeStore] Failed to save setting:', error);
      return false;
    }
  },

  remove: async (childId) => {
    if (!childId) return;
    const next = { ...get().enabledByChildId };
    delete next[String(childId)];
    set({ enabledByChildId: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('[SafeVolumeStore] Failed to remove setting:', error);
    }
  },

  getEffectiveVolume: (childId, requestedVolume) => {
    const volume = Math.min(1, Math.max(0, requestedVolume));
    return get().isEnabled(childId) ? Math.min(volume, SAFE_VOLUME_MAX) : volume;
  },
}));

void useSafeVolumeStore.getState().load();
