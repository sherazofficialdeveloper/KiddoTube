// src/store/screenTimeStore.ts

import { create } from 'zustand';
import { Api } from '../services/api';
import type { ScreenTimeSessionDto } from '../types/api';

/**
 * ScreenTimeStore
 * Migrated from Kotlin ScreenTimeRepository.kt
 * 
 * Handles:
 * - Daily limit tracking
 * - Watch seconds recording + throttled sync to backend
 * - PIN verification with lockout
 * - Temporary extensions
 * - Almost-time warning
 */

export type PinVerificationResult =
  | { type: 'SUCCESS'; remainingMinutes: number; totalTimeUsed: number }
  | { type: 'ERROR'; message: string; attemptsLeft: number }
  | { type: 'LOCKED_OUT'; lockoutSecondsRemaining: number };

export interface ScreenTimeState {
  dailyLimitMinutes: number;
  secondsWatched: number;
  tempExtensionMinutes: number;
  isTimerActive: boolean;
  isLocked: boolean;
  isAlmostTimeWarningShown: boolean;
  pendingWarningMinutes: 5 | 1 | null;
}

interface ScreenTimeStoreState extends ScreenTimeState {
  // Derived (computed each access)
  totalAllowedMinutes: number;
  remainingSeconds: number;
  remainingMinutes: number;
  minutesWatched: number;
  isTimeUp: boolean;

  // Internal refs (not persisted)
  _childToken: string | null;
  _childId: string | null;
  _parentId: string | null;
  _failedAttempts: number;
  _lockoutTimestamp: number;
  _pendingSyncSeconds: number;
  _warning5Shown: boolean;
  _warning1Shown: boolean;

  // Actions
  initializeForChild: (
    token: string,
    childId: string,
    parentId?: string | null,
    initialLimit?: number
  ) => Promise<void>;
  verifyParentPin: (pin: string) => Promise<PinVerificationResult>;
  grantTemporaryExtensionWithPin: (
    pin: string,
    extensionMinutes: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateDailyLimit: (newLimit: number) => void;
  grantTemporaryExtension: (extensionMinutes: number) => void;
  recordWatchSeconds: (seconds: number) => void;
  dismissAlmostTimeWarning: () => void;
  clearSession: () => void;
  recomputeDerived: () => void;
}

const MAX_FAILED_ATTEMPTS = 3;

const initialScreenTime: ScreenTimeState = {
  dailyLimitMinutes: 60,
  secondsWatched: 0,
  tempExtensionMinutes: 0,
  isTimerActive: false,
  isLocked: false,
  isAlmostTimeWarningShown: false,
  pendingWarningMinutes: null,
};

export const useScreenTimeStore = create<ScreenTimeStoreState>((set, get) => ({
  ...initialScreenTime,
  totalAllowedMinutes: 60,
  remainingSeconds: 3600,
  remainingMinutes: 60,
  minutesWatched: 0,
  isTimeUp: false,

  _childToken: null,
  _childId: null,
  _parentId: null,
  _failedAttempts: 0,
  _lockoutTimestamp: 0,
  _pendingSyncSeconds: 0,
  _warning5Shown: false,
  _warning1Shown: false,

  /**
   * Initialize from backend
   * Maps to Kotlin initializeForChild()
   */
  initializeForChild: async (token, childId, parentId, initialLimit = 60) => {
    set({
      _childToken: token,
      _childId: childId,
      _parentId: parentId ?? null,
    });

    try {
      const response = await Api.getChildWatchTime(parentId, childId);
      if (response.success && response.session) {
        applyServerSession(response.session, set);
        console.log(
          '[ScreenTimeStore] Loaded:',
          response.session.minutesWatched,
          'min / remaining:',
          response.session.remainingMinutes
        );
      } else {
        set({ dailyLimitMinutes: initialLimit, secondsWatched: 0 });
        get().recomputeDerived();
      }
    } catch (e: any) {
      console.warn('[ScreenTimeStore] Load failed:', e.message);
      set({ dailyLimitMinutes: initialLimit, secondsWatched: 0 });
      get().recomputeDerived();
    }
  },

  /**
   * Verify parent PIN with rate-limiting
   * Maps to Kotlin verifyParentPin()
   */
  verifyParentPin: async (pin) => {
    const currentTime = Date.now();
    const lockoutTs = get()._lockoutTimestamp;

    if (currentTime < lockoutTs) {
      const remainingSec = Math.floor((lockoutTs - currentTime) / 1000);
      return { type: 'LOCKED_OUT', lockoutSecondsRemaining: remainingSec };
    }

    try {
      const res = await Api.verifyPin({
        parentId: get()._parentId ?? 'parent_1',
        pin: pin.trim(),
      });

      if (res.success) {
        set({ _failedAttempts: 0 });
        const state = get();
        return {
          type: 'SUCCESS',
          remainingMinutes: state.remainingMinutes,
          totalTimeUsed: state.minutesWatched,
        };
      } else if (
        res.lockoutSecondsRemaining != null &&
        res.lockoutSecondsRemaining > 0
      ) {
        set({
          _lockoutTimestamp:
            currentTime + res.lockoutSecondsRemaining * 1000,
        });
        return {
          type: 'LOCKED_OUT',
          lockoutSecondsRemaining: res.lockoutSecondsRemaining,
        };
      } else {
        const newAttempts = get()._failedAttempts + 1;
        set({ _failedAttempts: newAttempts });
        const remainingTries =
          res.attemptsLeft ?? Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts);
        return {
          type: 'ERROR',
          message: res.message ?? res.error ?? 'Incorrect PIN. Please try again.',
          attemptsLeft: remainingTries,
        };
      }
    } catch (e: any) {
      console.error('[ScreenTimeStore] PIN verify failed:', e.message);
      return {
        type: 'ERROR',
        message:
          'Unable to reach security server. Please check your network connection.',
        attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - get()._failedAttempts),
      };
    }
  },

  /**
   * Grant temp extension via backend
   * Maps to Kotlin grantTemporaryExtensionWithPin()
   */
  grantTemporaryExtensionWithPin: async (pin, extensionMinutes) => {
    const token = get()._childToken;
    if (!token) {
      return {
        success: false,
        error: 'Child session expired. Please log in again.',
      };
    }

    try {
      const res = await Api.requestExtension({
        childId: get()._childId ?? 'kid_1',
        pin: pin.trim(),
        extensionMinutes,
      });

      if (res.success && res.session) {
        set({
          pendingWarningMinutes: null,
          isAlmostTimeWarningShown: false,
          _warning5Shown: false,
          _warning1Shown: false,
        });
        applyServerSession(res.session, set);
        return { success: true };
      }
      return {
        success: false,
        error: res.message ?? 'Failed to verify PIN or grant extension.',
      };
    } catch (e: any) {
      console.error('[ScreenTimeStore] Extension failed:', e.message);
      return {
        success: false,
        error:
          'Server connection failed. Could not verify parental extension.',
      };
    }
  },

  /**
   * Update daily limit locally
   * Maps to Kotlin updateDailyLimit()
   */
  updateDailyLimit: (newLimit) => {
    set({ dailyLimitMinutes: newLimit });
    get().recomputeDerived();
  },

  /**
   * Local extension (for testing)
   * Maps to Kotlin grantTemporaryExtension()
   */
  grantTemporaryExtension: (extensionMinutes) => {
    set((state) => ({
      tempExtensionMinutes: state.tempExtensionMinutes + extensionMinutes,
      isLocked: false,
      isAlmostTimeWarningShown: false,
      pendingWarningMinutes: null,
      _warning5Shown: false,
      _warning1Shown: false,
    }));
    get().recomputeDerived();
  },

  /**
   * Record 1 second of watching + throttled sync (every 10s)
   * Maps to Kotlin recordWatchSeconds()
   */
  recordWatchSeconds: (seconds) => {
    const state = get();
    if (state.isLocked) return;

    const previousRemainingSeconds = state.remainingSeconds;
    const newSecondsWatched = state.secondsWatched + seconds;
    const totalAllowedSeconds = state.totalAllowedMinutes * 60;
    const shouldLock = newSecondsWatched >= totalAllowedSeconds;

    set({
      secondsWatched: newSecondsWatched,
      isLocked: shouldLock,
    });
    get().recomputeDerived();
    const nextRemainingSeconds = get().remainingSeconds;
    const warningMinutes =
      previousRemainingSeconds > 5 * 60 &&
      nextRemainingSeconds <= 5 * 60 &&
      !get()._warning5Shown
        ? 5
        : previousRemainingSeconds > 1 * 60 &&
          nextRemainingSeconds <= 1 * 60 &&
          !get()._warning1Shown
        ? 1
        : null;
    if (warningMinutes !== null) {
      set({ pendingWarningMinutes: warningMinutes });
    }

    const newPending = state._pendingSyncSeconds + seconds;
    set({ _pendingSyncSeconds: newPending });

    // Sync every 10 seconds OR immediately on lock
    if (newPending >= 10 || shouldLock) {
      const syncAmount = newPending;
      set({ _pendingSyncSeconds: 0 });

      const token = state._childToken;
      if (token) {
        Api.syncWatchTime({
          childId: state._childId ?? 'kid_1',
          secondsIncrement: syncAmount,
        })
          .then((res) => {
            if (res.success && res.session) {
              const latest = get();
              if (
                res.session.secondsWatched >= latest.secondsWatched ||
                res.session.isTimeUp
              ) {
                applyServerSession(res.session, set);
              }
            }
          })
          .catch((e) => {
            console.warn('[ScreenTimeStore] Sync failed:', e.message);
          });
      }
    }
  },

  dismissAlmostTimeWarning: () => {
    const warning = get().pendingWarningMinutes;
    set({
      isAlmostTimeWarningShown: true,
      pendingWarningMinutes: null,
      ...(warning === 5 ? { _warning5Shown: true } : {}),
      ...(warning === 1 ? { _warning1Shown: true } : {}),
    });
  },

  clearSession: () => {
    set({
      ...initialScreenTime,
      _childToken: null,
      _childId: null,
      _parentId: null,
      _pendingSyncSeconds: 0,
      _failedAttempts: 0,
      _lockoutTimestamp: 0,
      _warning5Shown: false,
      _warning1Shown: false,
    });
    get().recomputeDerived();
  },

  /**
   * Recompute derived values after any change
   * Maps to Kotlin ScreenTimeState computed properties
   */
  recomputeDerived: () => {
    const s = get();
    const totalAllowedMinutes =
      s.dailyLimitMinutes + s.tempExtensionMinutes;
    const remainingSeconds = Math.max(
      0,
      totalAllowedMinutes * 60 - s.secondsWatched
    );
    set({
      totalAllowedMinutes,
      remainingSeconds,
      remainingMinutes: Math.floor(remainingSeconds / 60),
      minutesWatched: Math.floor(s.secondsWatched / 60),
      isTimeUp: remainingSeconds <= 0,
    });
  },
}));

/**
 * Apply backend session DTO to state
 */
function applyServerSession(
  dto: ScreenTimeSessionDto,
  set: (partial: any) => void
): void {
  const totalAllowed = dto.totalAllowedMinutes;
  const currentWatched = dto.secondsWatched;
  const isLocked = dto.isTimeUp || currentWatched >= totalAllowed * 60;

  set({
    dailyLimitMinutes: dto.dailyLimitMinutes,
    secondsWatched: currentWatched,
    tempExtensionMinutes: dto.tempExtensionMinutes,
    isLocked,
    isAlmostTimeWarningShown: isLocked,
    pendingWarningMinutes:
      !isLocked &&
      totalAllowed * 60 - currentWatched <= 60 &&
      !useScreenTimeStore.getState()._warning1Shown
        ? 1
        : !isLocked &&
          totalAllowed * 60 - currentWatched <= 5 * 60 &&
          !useScreenTimeStore.getState()._warning5Shown
        ? 5
        : null,
  });

  // Trigger derived recompute
  useScreenTimeStore.getState().recomputeDerived();
}

// Convenience selectors
export const selectRemainingMinutes = (s: ScreenTimeStoreState) =>
  s.remainingMinutes;
export const selectIsLocked = (s: ScreenTimeStoreState) => s.isLocked;
export const selectMinutesWatched = (s: ScreenTimeStoreState) =>
  s.minutesWatched;
export const selectDailyLimit = (s: ScreenTimeStoreState) =>
  s.dailyLimitMinutes;