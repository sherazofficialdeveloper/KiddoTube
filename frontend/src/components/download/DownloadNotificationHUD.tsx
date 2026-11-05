// src/components/download/DownloadNotificationHUD.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ChildFontText as Text } from '../ui/ChildFontText';
import {
  downloadManager,
  formatBytes,
  formatSpeed,
  formatEta,
} from '../../services/download/downloadManager';
import type { DownloadRecord } from '../../services/download/downloadTypes';
import { navigate } from '../../app/navigation/navigationRef';
import { ScreenState } from '../../types/navigation';

export const DownloadNotificationHUD: React.FC = () => {
  const [activeRecord, setActiveRecord] = useState<DownloadRecord | null>(null);
  const [recentlyCompleted, setRecentlyCompleted] = useState<DownloadRecord | null>(null);

  useEffect(() => {
    let completedTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = downloadManager.subscribe((records) => {
      const activeList = Object.values(records).filter(
        (r) => r.status === 'DOWNLOADING' || r.status === 'PAUSED'
      );

      if (activeList.length > 0) {
        setActiveRecord(activeList[0]);
      } else {
        // Check for recent completion
        const completedList = Object.values(records)
          .filter((r) => r.status === 'COMPLETED' && r.completedAt)
          .sort(
            (a, b) =>
              new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
          );

        if (completedList.length > 0) {
          const latest = completedList[0];
          const timeSinceComplete = Date.now() - new Date(latest.completedAt!).getTime();
          if (timeSinceComplete < 3500) {
            setRecentlyCompleted(latest);
            if (completedTimer) clearTimeout(completedTimer);
            completedTimer = setTimeout(() => {
              setRecentlyCompleted(null);
            }, 3000);
          }
        }
        setActiveRecord(null);
      }
    });

    return () => {
      unsubscribe();
      if (completedTimer) clearTimeout(completedTimer);
    };
  }, []);

  const displayRecord = activeRecord || recentlyCompleted;
  if (!displayRecord) return null;

  const isCompleted = displayRecord.status === 'COMPLETED';
  const isPaused = displayRecord.status === 'PAUSED';
  const downloadedMb = formatBytes(displayRecord.downloadedBytes);
  const totalMb = formatBytes(displayRecord.totalBytes);
  const speedStr = formatSpeed(displayRecord.speedBytesPerSec);
  const etaStr = formatEta(displayRecord.etaSeconds);

  const handleOpenDownloads = () => {
    try {
      navigate(ScreenState.DOWNLOADS_MANAGER as any);
    } catch {
      navigate(ScreenState.HOME);
    }
  };

  const handleTogglePause = () => {
    if (activeRecord) {
      if (isPaused) {
        downloadManager.resumeDownload(activeRecord.id);
      } else {
        downloadManager.pauseDownload(activeRecord.id);
      }
    }
  };

  const handleCancel = () => {
    if (activeRecord) {
      downloadManager.cancelDownload(activeRecord.id);
    } else {
      setRecentlyCompleted(null);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isCompleted && styles.completedCard,
          isPaused && styles.pausedCard,
        ]}
        activeOpacity={0.9}
        onPress={handleOpenDownloads}
        accessibilityRole="button"
        accessibilityLabel={`Download progress for ${displayRecord.title}`}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnailWrap}>
          {displayRecord.thumbnailUrl ? (
            <Image
              source={{ uri: displayRecord.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <MaterialIcons name="videocam" size={20} color="#94A3B8" />
            </View>
          )}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Info Column */}
        <View style={styles.infoCol}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {displayRecord.title}
            </Text>
            <Text style={[styles.statusTag, isCompleted && styles.completedTag]}>
              {isCompleted ? 'Saved' : isPaused ? 'Paused' : `${displayRecord.progressPercent}%`}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${displayRecord.progressPercent}%` },
                isCompleted && styles.completedFill,
                isPaused && styles.pausedFill,
              ]}
            />
          </View>

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {isCompleted
                ? `100% • ${totalMb} • Ready for offline watching`
                : `${downloadedMb} / ${totalMb}${!isPaused && speedStr ? ` • ${speedStr}` : ''}${!isPaused && etaStr ? ` • ${etaStr}` : ''}`}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {!isCompleted && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleTogglePause}
              accessibilityLabel={isPaused ? 'Resume download' : 'Pause download'}
            >
              <MaterialIcons
                name={isPaused ? 'play-arrow' : 'pause'}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleCancel}
            accessibilityLabel="Dismiss or cancel download"
          >
            <MaterialIcons name="close" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    zIndex: 9999,
    alignItems: 'center',
  },
  notificationCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  completedCard: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  pausedCard: {
    borderColor: '#F59E0B',
  },
  thumbnailWrap: {
    width: 52,
    height: 38,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    position: 'relative',
    marginRight: 10,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#10B981',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 8,
  },
  statusTag: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  completedTag: {
    color: '#34D399',
  },
  track: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  completedFill: {
    backgroundColor: '#10B981',
  },
  pausedFill: {
    backgroundColor: '#F59E0B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
