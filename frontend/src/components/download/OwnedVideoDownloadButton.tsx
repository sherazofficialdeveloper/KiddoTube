import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import RNFS from 'react-native-fs';

interface OwnedVideoDownloadButtonProps {
  videoId: string;
  title: string;
  videoUrl: string;
  onComplete?: (localUri: string) => void;
}

const isDirectHttpUrl = (value: string): boolean =>
  /^https?:\/\/\S+$/i.test(value) && !/(youtube\.com|youtu\.be)\//i.test(value);

const safeFileName = (title: string, videoId: string): string => {
  const cleanTitle = title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return `${cleanTitle || 'video'}-${videoId}-${Date.now()}.mp4`;
};

export const OwnedVideoDownloadButton: React.FC<OwnedVideoDownloadButtonProps> = ({
  videoId,
  title,
  videoUrl,
  onComplete,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const jobRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (jobRef.current !== null) {
        RNFS.stopDownload(jobRef.current);
      }
    };
  }, []);

  const startDownload = async () => {
    if (isDownloading) return;

    if (!isDirectHttpUrl(videoUrl.trim())) {
      Alert.alert(
        'Invalid video URL',
        'This button only supports a direct MP4 URL for content you own.'
      );
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const directory = `${RNFS.DocumentDirectoryPath}/owned-videos`;
      await RNFS.mkdir(directory);
      const localPath = `${directory}/${safeFileName(title, videoId)}`;

      const job = RNFS.downloadFile({
        fromUrl: videoUrl.trim(),
        toFile: localPath,
        progressDivider: 1,
        progress: ({ bytesWritten, contentLength }) => {
          if (contentLength > 0) {
            setDownloadProgress(
              Math.min(100, Math.round((bytesWritten / contentLength) * 100))
            );
          }
        },
      });
      jobRef.current = job.jobId;

      const result = await job.promise;
      jobRef.current = null;

      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error(`The server returned HTTP ${result.statusCode}.`);
      }

      const exists = await RNFS.exists(localPath);
      if (!exists) {
        throw new Error('The downloaded file was not created.');
      }

      setDownloadProgress(100);
      onComplete?.(`file://${localPath}`);
      Alert.alert('Download Success', 'The video is ready for offline playback.');
    } catch (error) {
      if (jobRef.current !== null) {
        RNFS.stopDownload(jobRef.current);
        jobRef.current = null;
      }
      Alert.alert(
        'Download Failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={startDownload}
      disabled={isDownloading}
      accessibilityRole="button"
      accessibilityLabel={`Download ${title}`}
    >
      {isDownloading ? (
        <>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.label}>{downloadProgress}%</Text>
        </>
      ) : (
        <Text style={styles.label}>Download</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 112,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0284C7',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
