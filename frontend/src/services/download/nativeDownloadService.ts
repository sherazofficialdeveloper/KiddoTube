// src/services/download/nativeDownloadService.ts
import { NativeModules, DeviceEventEmitter, Platform, PermissionsAndroid } from 'react-native';

const { DownloadNotificationModule } = NativeModules;

export interface NativeStorageStats {
  totalUsedBytes: number;
  freeBytes: number;
  totalDeviceBytes: number;
  videoCount: number;
  downloadsPath?: string;
}

export interface PermissionCheckResult {
  granted: boolean;
  areNotificationsEnabled: boolean;
  hasPostPermission: boolean;
  needsRuntimeRequest: boolean;
  blockedBySettings?: boolean;
}

class NativeDownloadService {
  private isAndroid: boolean;

  constructor() {
    this.isAndroid = Platform.OS === 'android' && !!DownloadNotificationModule;
  }

  public isNativeAvailable(): boolean {
    return this.isAndroid;
  }

  /**
   * Check whether notifications are enabled and permission is granted
   */
  public async checkNotificationPermission(): Promise<PermissionCheckResult> {
    if (this.isAndroid) {
      try {
        const res: PermissionCheckResult = await DownloadNotificationModule.checkNotificationPermission();
        return res;
      } catch (e: any) {
        console.warn('[NativeDownloadService] checkNotificationPermission error:', e.message);
      }
    }
    return {
      granted: true,
      areNotificationsEnabled: true,
      hasPostPermission: true,
      needsRuntimeRequest: false,
    };
  }

  /**
   * Request POST_NOTIFICATIONS permission at runtime on Android 13+ (API 33+)
   */
  public async ensureNotificationPermission(): Promise<boolean> {
    if (!this.isAndroid) return true;

    try {
      if (Number(Platform.Version) >= 33) {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (!hasPermission) {
          const status = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Download Progress Notifications',
              message:
                'KiddoTube needs permission to show real-time download progress in the notification shade.',
              buttonPositive: 'Allow',
              buttonNegative: 'Not Now',
            }
          );
          if (status === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
          }
        } else {
          return true;
        }
      }

      // Also invoke native module check
      const check = await this.checkNotificationPermission();
      return check.granted;
    } catch (err: any) {
      console.warn('[NativeDownloadService] ensureNotificationPermission warning:', err.message);
      return false;
    }
  }

  /**
   * Start native background download that streams real bytes to device disk
   * and updates system notification in real time.
   */
  public async startNativeDownload(
    videoId: string,
    title: string,
    videoUrl: string,
    durationText: string
  ): Promise<{ videoId: string; localUri: string; totalBytes: number }> {
    if (this.isAndroid) {
      await this.ensureNotificationPermission();
      const result = await DownloadNotificationModule.startNativeDownload(
        videoId,
        title,
        videoUrl,
        durationText
      );
      if (!result) {
        throw new Error('Download failed: No result from native module');
      }
      return result;
    }
    throw new Error('Native download not available on this platform');
  }

  public async purgeInvalidDownloads(): Promise<number> {
    if (this.isAndroid && typeof DownloadNotificationModule.purgeInvalidDownloads === 'function') {
      try {
        return await DownloadNotificationModule.purgeInvalidDownloads();
      } catch (e: any) {
        return 0;
      }
    }
    return 0;
  }

  public showProgress(
    id: string,
    title: string,
    downloadedBytes: number,
    totalBytes: number,
    progress: number,
    speedText: string,
    etaText: string
  ): void {
    if (this.isAndroid) {
      try {
        DownloadNotificationModule.showProgress(
          id,
          title,
          downloadedBytes,
          totalBytes,
          progress,
          speedText,
          etaText
        );
      } catch (e: any) {
        console.warn('[NativeDownloadService] showProgress error:', e.message);
      }
    }
  }

  public showCompleted(id: string, title: string, totalBytes: number): void {
    if (this.isAndroid) {
      try {
        DownloadNotificationModule.showCompleted(id, title, totalBytes);
      } catch (e: any) {
        console.warn('[NativeDownloadService] showCompleted error:', e.message);
      }
    }
  }

  public showFailed(id: string, title: string, error: string): void {
    if (this.isAndroid) {
      try {
        DownloadNotificationModule.showFailed(id, title, error);
      } catch (e: any) {
        console.warn('[NativeDownloadService] showFailed error:', e.message);
      }
    }
  }

  public cancelNotification(id: string): void {
    if (this.isAndroid) {
      try {
        DownloadNotificationModule.cancelNotification(id);
      } catch (e: any) {
        console.warn('[NativeDownloadService] cancelNotification error:', e.message);
      }
    }
  }

  public cancelAllNotifications(): void {
    if (this.isAndroid) {
      try {
        DownloadNotificationModule.cancelAllNotifications();
      } catch (e: any) {
        console.warn('[NativeDownloadService] cancelAll error:', e.message);
      }
    }
  }

  public async getStorageStats(): Promise<NativeStorageStats | null> {
    if (this.isAndroid) {
      try {
        const stats: NativeStorageStats = await DownloadNotificationModule.getStorageStats();
        return stats;
      } catch (e: any) {
        console.warn('[NativeDownloadService] getStorageStats error:', e.message);
      }
    }
    return null;
  }

  public async deleteLocalFile(videoId: string): Promise<boolean> {
    if (this.isAndroid) {
      try {
        return await DownloadNotificationModule.deleteLocalFile(videoId);
      } catch (e: any) {
        console.warn('[NativeDownloadService] deleteLocalFile error:', e.message);
      }
    }
    return true;
  }

  public async getDownloadsDirectory(): Promise<string | null> {
    if (this.isAndroid) {
      try {
        return await DownloadNotificationModule.getDownloadsDirectory();
      } catch (e: any) {
        console.warn('[NativeDownloadService] getDownloadsDirectory error:', e.message);
      }
    }
    return null;
  }

  /**
   * Listen for user tapping "Cancel Download" in the system notification shade
   */
  public addNotificationCancelListener(callback: (videoId: string) => void): () => void {
    const sub1 = DeviceEventEmitter.addListener('onNotificationCancelDownload', (videoId: string) => {
      if (videoId) callback(videoId);
    });
    const sub2 = DeviceEventEmitter.addListener('onNativeDownloadCancelled', (data: { videoId: string }) => {
      if (data?.videoId) callback(data.videoId);
    });
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }

  /**
   * Listen for native progress updates from the background download thread
   */
  public addDownloadProgressListener(
    callback: (data: {
      videoId: string;
      downloadedBytes: number;
      totalBytes: number;
      progress: number;
      speed: string;
      eta: string;
    }) => void
  ): () => void {
    const sub = DeviceEventEmitter.addListener('onNativeDownloadProgress', callback);
    return () => sub.remove();
  }

  /**
   * Listen for native download completion
   */
  public addDownloadCompletedListener(
    callback: (data: { videoId: string; localUri: string; totalBytes: number }) => void
  ): () => void {
    const sub = DeviceEventEmitter.addListener('onNativeDownloadCompleted', callback);
    return () => sub.remove();
  }
}

export const nativeDownloadService = new NativeDownloadService();
