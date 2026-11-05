// src/store/themeStore.ts

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  isBedtimePreviewOpen: boolean;
  captionsEnabled: boolean;
  eyeBreakEnabled: boolean;
  bedtimeSchedule: string;
  starsCount: number;
  appearanceScheduleEnabled: boolean;
  darkModeStart: string;
  lightModeStart: string;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setBedtimePreviewOpen: (open: boolean) => void;
  toggleCaptions: () => void;
  toggleEyeBreak: () => void;
  setBedtimeSchedule: (time: string) => void;
  setAppearanceScheduleEnabled: (enabled: boolean) => void;
  setDarkModeStart: (time: string) => void;
  setLightModeStart: (time: string) => void;
  addStar: () => void;
  loadPreferences: () => Promise<void>;
  persistPrefs: () => void;
}

const STORAGE_KEY_THEME = '@kiddotube_theme_mode';
const STORAGE_KEY_PREFS = '@kiddotube_child_prefs';

export const isDarkModeScheduled = (
  now: Date,
  darkModeStart: string,
  lightModeStart: string
): boolean => {
  const parseMinutes = (value: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const darkStart = parseMinutes(darkModeStart);
  const lightStart = parseMinutes(lightModeStart);
  if (darkStart === null || lightStart === null || darkStart === lightStart) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (darkStart > lightStart) {
    return currentMinutes >= darkStart || currentMinutes < lightStart;
  }
  return currentMinutes >= darkStart && currentMinutes < lightStart;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'light',
  isBedtimePreviewOpen: false,
  captionsEnabled: true,
  eyeBreakEnabled: true,
  bedtimeSchedule: '7:30 pm',
  starsCount: 3,
  appearanceScheduleEnabled: true,
  darkModeStart: '20:00',
  lightModeStart: '07:00',

  setThemeMode: (mode: ThemeMode) => {
    set({ themeMode: mode });
    AsyncStorage.setItem(STORAGE_KEY_THEME, mode).catch((e) =>
      console.warn('[ThemeStore] Failed to persist theme:', e)
    );
  },

  setBedtimePreviewOpen: (open: boolean) => {
    set({ isBedtimePreviewOpen: open });
  },

  toggleCaptions: () => {
    const updated = !get().captionsEnabled;
    set({ captionsEnabled: updated });
    get().persistPrefs();
  },

  toggleEyeBreak: () => {
    const updated = !get().eyeBreakEnabled;
    set({ eyeBreakEnabled: updated });
    get().persistPrefs();
  },

  setBedtimeSchedule: (time: string) => {
    set({ bedtimeSchedule: time });
    get().persistPrefs();
  },

  setAppearanceScheduleEnabled: (enabled: boolean) => {
    set({ appearanceScheduleEnabled: enabled });
    get().persistPrefs();
  },

  setDarkModeStart: (time: string) => {
    set({ darkModeStart: time });
    get().persistPrefs();
  },

  setLightModeStart: (time: string) => {
    set({ lightModeStart: time });
    get().persistPrefs();
  },

  addStar: () => {
    set((state) => ({ starsCount: state.starsCount + 1 }));
    get().persistPrefs();
  },

  persistPrefs: () => {
    const {
      captionsEnabled,
      eyeBreakEnabled,
      bedtimeSchedule,
      starsCount,
      appearanceScheduleEnabled,
      darkModeStart,
      lightModeStart,
    } = get();
    AsyncStorage.setItem(
      STORAGE_KEY_PREFS,
      JSON.stringify({
        captionsEnabled,
        eyeBreakEnabled,
        bedtimeSchedule,
        starsCount,
        appearanceScheduleEnabled,
        darkModeStart,
        lightModeStart,
      })
    ).catch((e) => console.warn('[ThemeStore] Failed to persist preferences:', e));
  },

  loadPreferences: async () => {
    try {
      const [savedTheme, savedPrefs] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_THEME),
        AsyncStorage.getItem(STORAGE_KEY_PREFS),
      ]);

      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        set({ themeMode: savedTheme });
      }

      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        set({
          captionsEnabled: parsed.captionsEnabled ?? true,
          eyeBreakEnabled: parsed.eyeBreakEnabled ?? true,
          bedtimeSchedule: parsed.bedtimeSchedule ?? '7:30 pm',
          starsCount: typeof parsed.starsCount === 'number' ? parsed.starsCount : 3,
          appearanceScheduleEnabled: parsed.appearanceScheduleEnabled ?? true,
          darkModeStart: parsed.darkModeStart ?? '20:00',
          lightModeStart: parsed.lightModeStart ?? '07:00',
        });
      }
    } catch (e) {
      console.warn('[ThemeStore] Failed to load preferences:', e);
    }
  },
}));

// Initialize storage load once
useThemeStore.getState().loadPreferences();
