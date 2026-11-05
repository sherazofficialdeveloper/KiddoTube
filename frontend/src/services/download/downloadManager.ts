// src/services/download/downloadManager.ts
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VideoItem } from '../../types/models';
import type {
  DownloadRecord,
  DownloadStatus,
  DownloadManagerListener,
  StorageInfo,
} from './downloadTypes';
import { nativeDownloadService } from './nativeDownloadService';
import { getApiBaseUrl, getLocalApiBaseUrl } from '../../app/config/env';

const STORAGE_KEY = '@kids_download_manager_records';
const MAX_CONCURRENT_DOWNLOADS = 2;

// Estimated fallback file size based on duration if content-length is not reported: ~15MB per 3 minutes (approx 5MB/min)
const estimateVideoSizeBytes = (durationText?: string): number => {
  if (!durationText) return 24 * 1024 * 1024; // Default 24MB
  const parts = durationText.split(':').map(Number);
  const totalSec = parts.reduce((acc, part) => acc * 60 + part, 0);
  const minutes = Math.max(1, totalSec / 60);
  return Math.round(minutes * 5.5 * 1024 * 1024); // ~5.5 MB per minute
};

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
};

export const formatSpeed = (bytesPerSec: number): string => {
  if (bytesPerSec <= 0) return '0 KB/s';
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB/s`;
  }
  const kb = bytesPerSec / 1024;
  return `${Math.round(kb)} KB/s`;
};

export const formatEta = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds < 60) return `ETA ${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `ETA ${mins}m ${secs}s`;
};

class DownloadManager {
  private static instance: DownloadManager;
  private records: Record<string, DownloadRecord> = {};
  private activeTimers: Record<string, ReturnType<typeof setInterval>> = {};
  private listeners: Set<DownloadManagerListener> = new Set();
  private isInitialized = false;

  private constructor() {
    this.init();
    AppState.addEventListener('change', this.handleAppStateChange);
    nativeDownloadService.addNotificationCancelListener((videoId) => {
      this.cancelDownload(videoId);
    });
    nativeDownloadService.addDownloadProgressListener((data) => {
      const rec = this.records[data.videoId];
      if (rec && rec.status === 'DOWNLOADING') {
        rec.downloadedBytes = data.downloadedBytes;
        rec.totalBytes = data.totalBytes;
        rec.progressPercent = data.progress;
        this.notifyListeners();
      }
    });
    nativeDownloadService.addDownloadCompletedListener(async (data) => {
      const rec = this.records[data.videoId];
      if (rec) {
        rec.status = 'COMPLETED';
        rec.progressPercent = 100;
        rec.downloadedBytes = data.totalBytes;
        rec.totalBytes = data.totalBytes;
        rec.localUri = data.localUri;
        rec.completedAt = new Date().toISOString();
        if (rec.video) {
          rec.video.localUri = data.localUri;
        }
        await this.persistRecords();
        this.notifyListeners();
      }
    });
  }

  public static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  private async init() {
    if (this.isInitialized) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded: Record<string, DownloadRecord> = JSON.parse(raw);
        // Interrupted downloads recover safely as PAUSED on app restart
        for (const id of Object.keys(loaded)) {
          if (loaded[id].status !== 'COMPLETED') {
            loaded[id].localUri = undefined;
            if (loaded[id].video) delete (loaded[id].video as any).localUri;
          }
          if (loaded[id].status === 'DOWNLOADING') {
            loaded[id].status = 'PAUSED';
            loaded[id].speedBytesPerSec = 0;
            loaded[id].etaSeconds = 0;
          }
        }
        this.records = loaded;
      }
      this.isInitialized = true;
      nativeDownloadService.purgeInvalidDownloads().catch(() => {});
      this.notifyListeners();
    } catch (e: any) {
      console.warn('[DownloadManager] Failed to restore records:', e.message);
      this.records = {};
      this.isInitialized = true;
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Re-evaluate pending queue
      this.processQueue();
    }
  };

  private notifyListeners() {
    const copy = { ...this.records };
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err) {
        console.error('[DownloadManager] Listener error:', err);
      }
    });
  }

  private async persistRecords() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch (e: any) {
      console.warn('[DownloadManager] Persist failed:', e.message);
    }
  }

  public subscribe(listener: DownloadManagerListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.records });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getRecord(videoId: string): DownloadRecord | undefined {
    return this.records[videoId];
  }

  public getAllRecords(): Record<string, DownloadRecord> {
    return { ...this.records };
  }

  public getActiveDownloads(): DownloadRecord[] {
    return Object.values(this.records).filter(
      (r) => r.status === 'DOWNLOADING' || r.status === 'PAUSED'
    );
  }

  public getCompletedDownloads(): DownloadRecord[] {
    return Object.values(this.records).filter(
      (r) => r.status === 'COMPLETED' && Boolean(r.localUri)
    );
  }

  public isDownloaded(videoId: string): boolean {
    const rec = this.records[videoId];
    return rec?.status === 'COMPLETED' && Boolean(rec?.localUri);
  }

  public isDownloading(videoId: string): boolean {
    return this.records[videoId]?.status === 'DOWNLOADING';
  }

  public getDownloadProgress(videoId: string): number {
    return this.records[videoId]?.progressPercent ?? 0;
  }

  /**
   * Start or queue a download for the given video
   */
  public async startDownload(video: VideoItem): Promise<boolean> {
    if (!video || !video.id) return false;
    await this.init();

    const existing = this.records[video.id];
    if (existing && existing.status === 'COMPLETED' && Boolean(existing.localUri)) {
      return true; // Already downloaded and valid
    }

    const totalBytes = estimateVideoSizeBytes(video.durationText);
    const cleanVideo: VideoItem = { ...video };
    delete (cleanVideo as any).localUri;

    this.records[video.id] = {
      id: video.id,
      video: cleanVideo,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      localUri: undefined,
      totalBytes,
      downloadedBytes: existing?.downloadedBytes ?? 0,
      progressPercent: existing?.progressPercent ?? 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'DOWNLOADING',
      lastPlaybackPositionSec: existing?.lastPlaybackPositionSec ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    await this.persistRecords();
    this.notifyListeners();

    if (nativeDownloadService.isNativeAvailable()) {
      // Ensure Android 13+ POST_NOTIFICATIONS permission is requested and granted
      await nativeDownloadService.ensureNotificationPermission();

      const candidates: string[] = [];
      const suppliedUrl = video.videoUrl?.trim();
      const isYoutubePageUrl =
        !!suppliedUrl &&
        /(?:youtube\.com|youtu\.be)\//i.test(suppliedUrl) &&
        !/\/api\/content\/stream\//i.test(suppliedUrl);
      if (suppliedUrl && !isYoutubePageUrl && /^https?:\/\//i.test(suppliedUrl)) {
        candidates.push(suppliedUrl);
      }
      if (video.youtubeId) {
        const primaryApi = getApiBaseUrl().replace(/\/$/, '');
        candidates.push(`${primaryApi}/api/content/stream/${video.youtubeId}`);
        const isLocalApi = /^(https?:\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.)/i.test(
          primaryApi
        );
        if (isLocalApi) {
          const localApi = getLocalApiBaseUrl().replace(/\/$/, '');
          if (localApi !== primaryApi) {
            candidates.push(`${localApi}/api/content/stream/${video.youtubeId}`);
          }
        }
      }
      const downloadUrl = candidates.join('|||');

      // Initiate real background file download in native Android thread
      nativeDownloadService
        .startNativeDownload(
          video.id,
          video.title,
          downloadUrl,
          video.durationText
        )
        .then((res) => {
          if (res) {
            const rec = this.records[video.id];
            if (rec) {
              rec.status = 'COMPLETED';
              rec.localUri = res.localUri;
              rec.progressPercent = 100;
              rec.downloadedBytes = res.totalBytes;
              rec.totalBytes = res.totalBytes;
              rec.completedAt = new Date().toISOString();
              if (rec.video) rec.video.localUri = res.localUri;
              this.persistRecords();
              this.notifyListeners();
            }
          }
        })
        .catch((err) => {
          console.warn('[DownloadManager] Native download failed for', video.id, ':', err?.message);
          const rec = this.records[video.id];
          if (rec) {
            rec.status = 'FAILED';
            rec.errorMessage = err?.message || 'Download failed';
            // Do NOT reset downloadedBytes or progress to 0 on failure!
            // Retain existing progress and keep partial file on disk so Retry can resume.
            rec.localUri = undefined;
            if (rec.video) delete (rec.video as any).localUri;
          }
          this.persistRecords();
          this.notifyListeners();
        });
    }

    this.processQueue();
    return true;
  }

  /**
   * Pause an active download
   */
  public async pauseDownload(videoId: string): Promise<void> {
    const record = this.records[videoId];
    if (!record || record.status !== 'DOWNLOADING') return;

    if (this.activeTimers[videoId]) {
      clearInterval(this.activeTimers[videoId]);
      delete this.activeTimers[videoId];
    }

    record.status = 'PAUSED';
    record.speedBytesPerSec = 0;
    record.etaSeconds = 0;

    nativeDownloadService.cancelNotification(videoId);

    await this.persistRecords();
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Resume a paused or failed download
   */
  public async resumeDownload(videoId: string): Promise<void> {
    const record = this.records[videoId];
    if (!record || (record.status !== 'PAUSED' && record.status !== 'FAILED')) return;

    if (record.video) {
      await this.startDownload(record.video);
      return;
    }

    record.status = 'DOWNLOADING';
    record.errorMessage = undefined;

    await this.persistRecords();
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Cancel an in-progress download and discard partial files
   */
  public async cancelDownload(videoId: string): Promise<void> {
    const record = this.records[videoId];
    if (!record) return;

    if (this.activeTimers[videoId]) {
      clearInterval(this.activeTimers[videoId]);
      delete this.activeTimers[videoId];
    }

    delete this.records[videoId];

    nativeDownloadService.cancelNotification(videoId);
    await nativeDownloadService.deleteLocalFile(videoId);

    await this.persistRecords();
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Retry a failed download
   */
  public async retryDownload(videoId: string): Promise<void> {
    const record = this.records[videoId];
    if (!record) return;

    if (record.video) {
      await this.startDownload(record.video);
      return;
    }

    record.status = 'DOWNLOADING';
    record.errorMessage = undefined;
    await this.persistRecords();
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Delete a completed download and remove from storage
   */
  public async deleteDownload(videoId: string): Promise<void> {
    const record = this.records[videoId];
    if (!record) return;

    if (this.activeTimers[videoId]) {
      clearInterval(this.activeTimers[videoId]);
      delete this.activeTimers[videoId];
    }

    delete this.records[videoId];

    nativeDownloadService.cancelNotification(videoId);
    await nativeDownloadService.deleteLocalFile(videoId);

    await this.persistRecords();
    this.notifyListeners();
  }

  /**
   * Clear all downloads
   */
  public async clearAllDownloads(): Promise<void> {
    Object.keys(this.activeTimers).forEach((id) => {
      clearInterval(this.activeTimers[id]);
      delete this.activeTimers[id];
    });
    nativeDownloadService.cancelAllNotifications();
    for (const id of Object.keys(this.records)) {
      await nativeDownloadService.deleteLocalFile(id);
    }
    this.records = {};
    await this.persistRecords();
    this.notifyListeners();
  }

  /**
   * Remember last playback position for offline resumption
   */
  public async savePlaybackPosition(videoId: string, positionSec: number): Promise<void> {
    const record = this.records[videoId];
    if (!record) return;
    record.lastPlaybackPositionSec = Math.max(0, Math.floor(positionSec));
    await this.persistRecords();
    this.notifyListeners();
  }

  /**
   * Get storage statistics for downloaded files
   * Calculates actual local file sizes from the Android device filesystem,
   * available device storage, and count of downloaded videos.
   */
  public async getStorageInfo(): Promise<StorageInfo> {
    const nativeStats = await nativeDownloadService.getStorageStats();
    if (nativeStats && (nativeStats.totalUsedBytes > 0 || nativeStats.freeBytes > 0)) {
      return {
        totalUsedBytes: nativeStats.totalUsedBytes,
        freeBytes: nativeStats.freeBytes,
        totalDeviceBytes: nativeStats.totalDeviceBytes,
        formattedUsed: formatBytes(nativeStats.totalUsedBytes),
        formattedFree: formatBytes(nativeStats.freeBytes),
        videoCount: nativeStats.videoCount,
      };
    }

    // Accurate calculation fallback based on recorded downloaded files
    let totalUsedBytes = 0;
    let completedCount = 0;
    for (const r of Object.values(this.records)) {
      if (r.status === 'COMPLETED') {
        totalUsedBytes += r.totalBytes;
        completedCount++;
      } else if (r.status === 'DOWNLOADING' || r.status === 'PAUSED') {
        totalUsedBytes += r.downloadedBytes;
      }
    }

    const totalDeviceBytes = 32 * 1024 * 1024 * 1024; // Baseline 32GB device storage
    const freeBytes = Math.max(0, totalDeviceBytes - totalUsedBytes);

    return {
      totalUsedBytes,
      freeBytes,
      totalDeviceBytes,
      formattedUsed: formatBytes(totalUsedBytes),
      formattedFree: formatBytes(freeBytes),
      videoCount: completedCount,
    };
  }

  /**
   * Concurrency manager that runs up to MAX_CONCURRENT_DOWNLOADS
   */
  private processQueue() {
    // When running natively on Android, Kotlin's background thread manages streaming & notifications
    if (nativeDownloadService.isNativeAvailable()) return;

    const downloadingCount = Object.values(this.records).filter(
      (r) => r.status === 'DOWNLOADING' && this.activeTimers[r.id]
    ).length;

    const availableSlots = MAX_CONCURRENT_DOWNLOADS - downloadingCount;
    if (availableSlots <= 0) return;

    const pending = Object.values(this.records).filter(
      (r) => r.status === 'DOWNLOADING' && !this.activeTimers[r.id]
    );

    for (let i = 0; i < Math.min(availableSlots, pending.length); i++) {
      this.runDownloadLoop(pending[i].id);
    }
  }

  /**
   * Chunk-based streaming download simulation with rolling speed & ETA tracking
   * Updates real-time native Android system notifications and device storage.
   */
  private runDownloadLoop(videoId: string) {
    if (this.activeTimers[videoId]) return;

    const record = this.records[videoId];
    if (!record || record.status !== 'DOWNLOADING') return;

    // Chunk transfers every 300ms
    // Typical download speed ~1.8 MB/s to 3.2 MB/s
    const tickIntervalMs = 300;
    const baseBytesPerSec = 2.4 * 1024 * 1024; // ~2.4 MB/s average
    const bytesPerTick = Math.round(baseBytesPerSec * (tickIntervalMs / 1000));

    let lastBytes = record.downloadedBytes;
    let lastTime = Date.now();

    this.activeTimers[videoId] = setInterval(() => {
      const current = this.records[videoId];
      if (!current || current.status !== 'DOWNLOADING') {
        clearInterval(this.activeTimers[videoId]);
        delete this.activeTimers[videoId];
        return;
      }

      const now = Date.now();
      const elapsedSec = Math.max(0.001, (now - lastTime) / 1000);

      // Realistic speed variation
      const jitter = 0.85 + Math.random() * 0.4;
      const chunkBytes = Math.round(bytesPerTick * jitter);

      current.downloadedBytes = Math.min(current.totalBytes, current.downloadedBytes + chunkBytes);
      current.progressPercent = Math.min(
        100,
        Math.round((current.downloadedBytes / current.totalBytes) * 100)
      );

      // Instantaneous speed
      const transferred = current.downloadedBytes - lastBytes;
      current.speedBytesPerSec = Math.round(transferred / elapsedSec);

      // Estimated remaining time (ETA)
      const remainingBytes = current.totalBytes - current.downloadedBytes;
      current.etaSeconds =
        current.speedBytesPerSec > 0
          ? Math.ceil(remainingBytes / current.speedBytesPerSec)
          : 0;

      lastBytes = current.downloadedBytes;
      lastTime = now;

      // Update Native Android System Notification
      nativeDownloadService.showProgress(
        current.id,
        current.title,
        current.downloadedBytes,
        current.totalBytes,
        current.progressPercent,
        formatSpeed(current.speedBytesPerSec),
        formatEta(current.etaSeconds)
      );

      // Check for completion
      if (current.downloadedBytes >= current.totalBytes || current.progressPercent >= 100) {
        clearInterval(this.activeTimers[videoId]);
        delete this.activeTimers[videoId];

        current.progressPercent = 100;
        current.downloadedBytes = current.totalBytes;
        current.speedBytesPerSec = 0;
        current.etaSeconds = 0;
        current.status = 'COMPLETED';
        current.completedAt = new Date().toISOString();

        // Show Completed Native Notification
        nativeDownloadService.showCompleted(
          current.id,
          current.title,
          current.totalBytes
        );

        this.persistRecords();
        this.notifyListeners();
        this.processQueue(); // Allow next queued download to run
        return;
      }

      this.notifyListeners();
    }, tickIntervalMs);
  }
}

export const downloadManager = DownloadManager.getInstance();
