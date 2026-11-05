import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

export const EYE_BREAK_INTERVAL_SECONDS = 20 * 60;

interface EyeBreakState {
  activeWatching: boolean;
  accumulatedSeconds: number;
  reminderVisible: boolean;
  setWatching: (watching: boolean) => void;
  acknowledgeReminder: () => void;
  reset: () => void;
}

let appIsActive =
  AppState.currentState !== 'background' &&
  AppState.currentState !== 'inactive';
let timer: ReturnType<typeof setInterval> | null = null;

const stopTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

const startTimer = () => {
  if (timer) return;
  timer = setInterval(() => {
    const state = useEyeBreakStore.getState();
    if (!appIsActive || !state.activeWatching || state.reminderVisible) return;

    const nextSeconds = state.accumulatedSeconds + 1;
    if (nextSeconds >= EYE_BREAK_INTERVAL_SECONDS) {
      useEyeBreakStore.setState({
        accumulatedSeconds: EYE_BREAK_INTERVAL_SECONDS,
        activeWatching: false,
        reminderVisible: true,
      });
      stopTimer();
      return;
    }
    useEyeBreakStore.setState({ accumulatedSeconds: nextSeconds });
  }, 1000);
};

const updateTimer = () => {
  const state = useEyeBreakStore.getState();
  if (appIsActive && state.activeWatching && !state.reminderVisible) {
    startTimer();
  } else {
    stopTimer();
  }
};

export const useEyeBreakStore = create<EyeBreakState>((set) => ({
  activeWatching: false,
  accumulatedSeconds: 0,
  reminderVisible: false,

  setWatching: (watching) => {
    set({ activeWatching: watching });
    updateTimer();
  },

  acknowledgeReminder: () => {
    set({ accumulatedSeconds: 0, reminderVisible: false });
    updateTimer();
  },

  reset: () => {
    set({ activeWatching: false, accumulatedSeconds: 0, reminderVisible: false });
    stopTimer();
  },
}));

const handleAppStateChange = (nextState: AppStateStatus) => {
  appIsActive = nextState === 'active';
  updateTimer();
};

AppState.addEventListener('change', handleAppStateChange);
