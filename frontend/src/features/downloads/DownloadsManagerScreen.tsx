// src/features/downloads/DownloadsManagerScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ChildFontText as Text } from '../../components/ui/ChildFontText';
import {
  downloadManager,
  formatBytes,
  formatSpeed,
  formatEta,
} from '../../services/download/downloadManager';
import type {
  DownloadRecord,
  StorageInfo,
} from '../../services/download/downloadTypes';
import { navigate } from '../../app/navigation/navigationRef';
import { ScreenState } from '../../types/navigation';
import { useContentStore } from '../../store/contentStore';
import { formatVideoDuration } from '../../utils/formatTime';

export const DownloadsManagerScreen: React.FC = () => {
  const [records, setRecords] = useState<Record<string, DownloadRecord>>({});
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  const removeDownloadedVideo = useContentStore((s) => s.removeDownloadedVideo);

  useEffect(() => {
    const unsubscribe = downloadManager.subscribe((updated) => {
      setRecords(updated);
      downloadManager.getStorageInfo().then(setStorageInfo);
    });

    downloadManager.getStorageInfo().then(setStorageInfo);

    return () => {
      unsubscribe();
    };
  }, []);

  const activeDownloads = Object.values(records).filter(
    (r) => r.status === 'DOWNLOADING' || r.status === 'PAUSED' || r.status === 'FAILED'
  );

  const completedDownloads = Object.values(records).filter(
    (r) => r.status === 'COMPLETED'
  );

  const handleBack = () => {
    navigate(ScreenState.HOME);
  };

  const handlePlayVideo = (record: DownloadRecord) => {
    navigate(ScreenState.PLAYER, {
      videoId: record.id,
      previousScreen: ScreenState.HOME,
      isDownloads: true,
      sourceVideoIds: completedDownloads.map((c) => c.id),
    });
  };

  const handleDeleteDownload = (record: DownloadRecord) => {
    Alert.alert(
      'Delete Download? 🗑️',
      `Are you sure you want to remove "${record.title}" from your device? This will free up ${formatBytes(record.totalBytes)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await downloadManager.deleteDownload(record.id);
            await removeDownloadedVideo(record.id);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (completedDownloads.length === 0 && activeDownloads.length === 0) return;
    Alert.alert(
      'Clear All Downloads? ⚠️',
      'This will remove all downloaded offline videos and free up all used storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await downloadManager.clearAllDownloads();
            for (const c of completedDownloads) {
              await removeDownloadedVideo(c.id);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Back to Home"
        >
          <MaterialIcons name="arrow-back" size={26} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Downloads Manager</Text>
          <Text style={styles.headerSubtitle}>
            Offline Video Library & Progress
          </Text>
        </View>

        <TouchableOpacity
          style={styles.clearAllBtn}
          onPress={handleClearAll}
          accessibilityLabel="Clear all downloads"
        >
          <MaterialIcons name="delete-sweep" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Storage Indicator Bar */}
      {storageInfo && (
        <View style={styles.storageCard}>
          <View style={styles.storageTop}>
            <View style={styles.storageLabelRow}>
              <MaterialIcons name="sd-storage" size={18} color="#0284C7" />
              <Text style={styles.storageLabel}>Device Storage</Text>
            </View>
            <Text style={styles.storageText}>
              <Text style={styles.storageUsed}>{storageInfo.formattedUsed}</Text> used ({completedDownloads.length} {completedDownloads.length === 1 ? 'video' : 'videos'}) • {storageInfo.formattedFree} available
            </Text>
          </View>
          <View style={styles.storageTrack}>
            <View
              style={[
                styles.storageFill,
                {
                  width: `${Math.min(
                    100,
                    Math.max(
                      2,
                      (storageInfo.totalUsedBytes / storageInfo.totalDeviceBytes) * 100
                    )
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Downloads Section */}
        {activeDownloads.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="cloud-download" size={20} color="#0284C7" />
              <Text style={styles.sectionTitle}>
                Downloading ({activeDownloads.length})
              </Text>
            </View>

            {activeDownloads.map((item) => {
              const isPaused = item.status === 'PAUSED';
              const isFailed = item.status === 'FAILED';
              const speedStr = formatSpeed(item.speedBytesPerSec);
              const etaStr = formatEta(item.etaSeconds);

              return (
                <View key={item.id} style={styles.activeCard}>
                  <View style={styles.activeTopRow}>
                    <Image
                      source={{ uri: item.thumbnailUrl }}
                      style={styles.activeThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.activeInfoCol}>
                      <Text
                        style={styles.activeTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.activeChannel} numberOfLines={1}>
                        {item.channelTitle}
                      </Text>
                      <View style={styles.activeStatusRow}>
                        <Text
                          style={[
                            styles.activeStatusBadge,
                            isPaused && styles.pausedBadge,
                            isFailed && styles.failedBadge,
                          ]}
                        >
                          {isFailed
                            ? 'Failed'
                            : isPaused
                            ? 'Paused'
                            : `Downloading ${item.progressPercent}%`}
                        </Text>
                        {!isPaused && !isFailed && (
                          <Text style={styles.speedText}>
                            {speedStr} {etaStr ? `• ${etaStr}` : ''}
                          </Text>
                        )}
                        {isFailed && Boolean(item.errorMessage) && (
                          <Text style={styles.errorText} numberOfLines={1}>
                            • {item.errorMessage}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.activeTrack}>
                    <View
                      style={[
                        styles.activeFill,
                        { width: `${item.progressPercent}%` },
                        isPaused && styles.pausedFill,
                        isFailed && styles.failedFill,
                      ]}
                    />
                  </View>

                  {/* Bottom Controls */}
                  <View style={styles.activeControlsRow}>
                    <Text style={styles.sizeRatioText}>
                      {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
                    </Text>

                    <View style={styles.btnGroup}>
                      {isFailed ? (
                        <TouchableOpacity
                          style={styles.retryBtn}
                          onPress={() => downloadManager.retryDownload(item.id)}
                        >
                          <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
                          <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.pauseBtn, isPaused && styles.resumeBtn]}
                          onPress={() =>
                            isPaused
                              ? downloadManager.resumeDownload(item.id)
                              : downloadManager.pauseDownload(item.id)
                          }
                        >
                          <MaterialIcons
                            name={isPaused ? 'play-arrow' : 'pause'}
                            size={18}
                            color="#FFFFFF"
                          />
                          <Text style={styles.pauseText}>
                            {isPaused ? 'Resume' : 'Pause'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => downloadManager.cancelDownload(item.id)}
                      >
                        <MaterialIcons name="close" size={18} color="#64748B" />
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Completed Downloads Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>
              Offline Videos ({completedDownloads.length})
            </Text>
          </View>

          {completedDownloads.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="file-download-off" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No offline videos saved</Text>
              <Text style={styles.emptySubtitle}>
                Tap the Download button on any video while online to save it here for offline viewing anytime! 🚀
              </Text>
            </View>
          ) : (
            completedDownloads.map((item) => (
              <View key={item.id} style={styles.completedCard}>
                <TouchableOpacity
                  style={styles.completedThumbWrap}
                  activeOpacity={0.85}
                  onPress={() => handlePlayVideo(item)}
                >
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.completedThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {formatVideoDuration(item.video.durationText)}
                    </Text>
                  </View>
                  <View style={styles.playOverlayIcon}>
                    <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <View style={styles.completedInfoCol}>
                  <Text
                    style={styles.completedTitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.completedChannel} numberOfLines={1}>
                    {item.channelTitle}
                  </Text>

                  <View style={styles.completedMetaRow}>
                    <Text style={styles.fileSizeBadge}>
                      {formatBytes(item.totalBytes)}
                    </Text>
                    {item.lastPlaybackPositionSec > 5 && (
                      <Text style={styles.resumeBadge}>
                        Resume at {Math.floor(item.lastPlaybackPositionSec / 60)}:
                        {String(Math.floor(item.lastPlaybackPositionSec % 60)).padStart(2, '0')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.completedActionRow}>
                    <TouchableOpacity
                      style={styles.playOfflineBtn}
                      activeOpacity={0.8}
                      onPress={() => handlePlayVideo(item)}
                    >
                      <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
                      <Text style={styles.playOfflineText}>Play Offline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      activeOpacity={0.7}
                      onPress={() => handleDeleteDownload(item)}
                      accessibilityLabel="Delete offline video"
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  clearAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  storageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storageLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  storageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  storageUsed: {
    color: '#0284C7',
    fontWeight: '800',
  },
  storageTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  activeTopRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  activeThumb: {
    width: 90,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  activeInfoCol: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeChannel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  activeStatusBadge: {
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pausedBadge: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  failedBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  speedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  activeTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  activeFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 3,
  },
  pausedFill: {
    backgroundColor: '#D97706',
  },
  failedFill: {
    backgroundColor: '#DC2626',
  },
  activeControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeRatioText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  resumeBtn: {
    backgroundColor: '#10B981',
  },
  pauseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  cancelText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  completedThumbWrap: {
    width: 120,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  completedThumb: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  playOverlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedInfoCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  completedChannel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  completedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  fileSizeBadge: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '800',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resumeBadge: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '800',
  },
  completedActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  playOfflineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E52E2E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  playOfflineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
