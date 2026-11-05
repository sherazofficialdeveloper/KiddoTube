import { NativeModules, Platform } from 'react-native';

interface SafeVolumeNativeApi {
  setSafeVolumeEnabled: (enabled: boolean) => void;
  enforceSafeVolume: () => void;
}

const nativeApi =
  Platform.OS === 'android'
    ? (NativeModules.SafeVolumeModule as SafeVolumeNativeApi | undefined)
    : undefined;

export const setNativeSafeVolumeEnabled = (enabled: boolean): void => {
  nativeApi?.setSafeVolumeEnabled(enabled);
};

export const enforceNativeSafeVolume = (): void => {
  nativeApi?.enforceSafeVolume();
};
