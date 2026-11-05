// src/services/download/downloadManager.test.ts
import {
  downloadManager,
  formatBytes,
  formatSpeed,
  formatEta,
} from './downloadManager';
import type { VideoItem } from '../../types/models';
import { VideoCategory } from '../../types/models';

const mockVideo: VideoItem = {
  id: 'test_vid_101',
  youtubeId: 'abcdefghijk',
  title: 'Learn Alphabet with Fun Animals',
  channelTitle: 'Kids Learning Fun',
  thumbnailUrl: 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg',
  durationText: '03:30',
  category: VideoCategory.LEARNING,
};

describe('DownloadManager & Formatting Helpers', () => {
  beforeEach(async () => {
    await downloadManager.clearAllDownloads();
  });

  afterEach(async () => {
    await downloadManager.clearAllDownloads();
  });

  describe('Formatting Utilities', () => {
    it('formats bytes correctly into MB and GB', () => {
      expect(formatBytes(0)).toBe('0 MB');
      expect(formatBytes(15 * 1024 * 1024)).toBe('15.0 MB');
      expect(formatBytes(1200 * 1024 * 1024)).toBe('1.2 GB');
    });

    it('formats download speeds in KB/s and MB/s', () => {
      expect(formatSpeed(0)).toBe('0 KB/s');
      expect(formatSpeed(512 * 1024)).toBe('512 KB/s');
      expect(formatSpeed(2.4 * 1024 * 1024)).toBe('2.4 MB/s');
    });

    it('formats estimated remaining time (ETA)', () => {
      expect(formatEta(0)).toBe('');
      expect(formatEta(25)).toBe('ETA 25s');
      expect(formatEta(95)).toBe('ETA 1m 35s');
    });
  });

  describe('Download Lifecycle & Queue', () => {
    it('starts download and adds record with initial DOWNLOADING state', async () => {
      const started = await downloadManager.startDownload(mockVideo);
      expect(started).toBe(true);

      const record = downloadManager.getRecord(mockVideo.id);
      expect(record).toBeDefined();
      expect(record?.title).toBe(mockVideo.title);
      expect(record?.status).toBe('DOWNLOADING');
      expect(record?.totalBytes).toBeGreaterThan(0);
    });

    it('pauses and resumes a download', async () => {
      await downloadManager.startDownload(mockVideo);
      await downloadManager.pauseDownload(mockVideo.id);

      let record = downloadManager.getRecord(mockVideo.id);
      expect(record?.status).toBe('PAUSED');
      expect(record?.speedBytesPerSec).toBe(0);

      await downloadManager.resumeDownload(mockVideo.id);
      record = downloadManager.getRecord(mockVideo.id);
      expect(record?.status).toBe('DOWNLOADING');
    });

    it('cancels download and removes record', async () => {
      await downloadManager.startDownload(mockVideo);
      await downloadManager.cancelDownload(mockVideo.id);

      const record = downloadManager.getRecord(mockVideo.id);
      expect(record).toBeUndefined();
    });

    it('remembers and saves playback position for offline resumption', async () => {
      await downloadManager.startDownload(mockVideo);
      await downloadManager.savePlaybackPosition(mockVideo.id, 85);

      const record = downloadManager.getRecord(mockVideo.id);
      expect(record?.lastPlaybackPositionSec).toBe(85);
    });

    it('calculates storage info accurately', async () => {
      await downloadManager.startDownload(mockVideo);
      const storage = await downloadManager.getStorageInfo();

      expect(storage.totalDeviceBytes).toBeGreaterThan(0);
      expect(storage.formattedUsed).toBeDefined();
      expect(storage.formattedFree).toBeDefined();
    });
  });
});
