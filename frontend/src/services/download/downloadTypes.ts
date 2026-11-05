// src/services/download/downloadTypes.ts
import type { VideoItem } from '../../types/models';

export type DownloadStatus =
  | 'IDLE'
  | 'DOWNLOADING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface DownloadRecord {
  id: string; // video.id
  video: VideoItem;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoUrl?: string;
  localUri?: string;
  totalBytes: number;
  downloadedBytes: number;
  progressPercent: number; // 0..100
  speedBytesPerSec: number;
  etaSeconds: number;
  status: DownloadStatus;
  errorMessage?: string;
  lastPlaybackPositionSec: number;
  completedAt?: string;
  createdAt: string;
}

export interface StorageInfo {
  totalUsedBytes: number;
  freeBytes: number;
  totalDeviceBytes: number;
  formattedUsed: string;
  formattedFree: string;
  videoCount?: number;
}

export interface DownloadManagerListener {
  (records: Record<string, DownloadRecord>): void;
}

