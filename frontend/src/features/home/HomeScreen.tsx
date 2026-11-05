// src/features/home/HomeScreen.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';

import { KidsHeader } from '../../components/layout/KidsHeader';
import { KidsBottomNavigation } from '../../components/layout/KidsBottomNavigation';
import { KidsCategoryRow } from '../../components/ui/KidsCategoryRow';
import { KidsVideoCard } from '../../components/ui/KidsVideoCard';
import { KidsPlaylistCard } from '../../components/ui/KidsPlaylistCard';
import { KidsEmptyState } from '../../components/ui/KidsStatusViews';
import { KidsCastSheet } from '../../components/layout/KidsCastSheet';
import { KidsPolicyDialog } from '../../components/layout/KidsPolicyDialog';
import { ParentsPasscodeModal } from '../parental/ParentsPasscodeModal';
import { ParentExtensionDialog } from '../parental/ParentExtensionDialog';

import { useContentStore } from '../../store/contentStore';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { useKidsTheme } from '../../theme/ThemeProvider';
import { VideoCategory } from '../../types/models';
import type { PlaylistItem, VideoItem } from '../../types/models';
import { ChildTab, ScreenState } from '../../types/navigation';
import { navigate } from '../../app/navigation/navigationRef';
import { nativeDownloadService } from '../../services/download/nativeDownloadService';

type HomeFeedItem =
  | { type: 'playlist'; item: PlaylistItem }
  | { type: 'video'; item: VideoItem };

export const HomeScreen: React.FC = () => {
  const { isDark } = useKidsTheme();
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>(
    VideoCategory.ALL
  );

  // Dialog and bottom sheet states
  const [showCastSheet, setShowCastSheet] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [showTimerDialog, setShowTimerDialog] = useState(false);

  const videos = useContentStore((s) => s.approvedVideos);
  const playlists = useContentStore((s) => s.approvedPlaylists);
  const downloadedVideos = useContentStore((s) => s.downloadedVideos);
  const activeDownloadingVideos = useContentStore((s) => s.activeDownloadingVideos);
  const downloadProgress = useContentStore((s) => s.downloadProgress);
  const isDownloaded = useContentStore((s) => s.isDownloaded);
  const isDownloading = useContentStore((s) => s.isDownloading);
  const removeDownloadedVideo = useContentStore((s) => s.removeDownloadedVideo);
  const startVideoDownload = useContentStore((s) => s.startVideoDownload);
  const blockVideo = useContentStore((s) => s.blockVideo);
  const isBackendConnected = useContentStore((s) => s.isBackendConnected);
  const refreshOnlineContent = useContentStore((s) => s.refreshOnlineContent);
  const currentProfile = useContentStore((s) => s.selectedProfile);

  const remainingMinutes = useScreenTimeStore((s) => s.remainingMinutes);
  const profileEmoji = currentProfile?.avatarEmoji ?? '🦁';
  const [selectedOptionsVideo, setSelectedOptionsVideo] = useState<VideoItem | null>(null);

  useEffect(() => {
    nativeDownloadService.ensureNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const refresh = () => {
      if (mounted && AppState.currentState === 'active') {
        refreshOnlineContent();
      }
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    refreshTimer = setInterval(refresh, 15000);
    refresh();

    return () => {
      mounted = false;
      subscription.remove();
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [refreshOnlineContent]);

  const isDownloadsView = selectedCategory === VideoCategory.DOWNLOADS || !isBackendConnected;
  const isPlaylistView = !isBackendConnected ? false : selectedCategory === VideoCategory.PLAYLISTS;

  const displayDownloads = useMemo(() => {
    // In downloads tab and offline mode, strictly display ONLY fully completed downloads.
    return downloadedVideos.filter((v) => Boolean((v as any).localUri));
  }, [downloadedVideos]);

  // Filter videos by category and prioritize liked/favorite videos at top.
  // When offline (!isBackendConnected), strictly display only downloaded videos.
  const activeVideoList = !isBackendConnected
    ? displayDownloads
    : isDownloadsView
    ? displayDownloads
    : selectedCategory === VideoCategory.ALL
    ? videos
    : videos.filter((v) => v.category === selectedCategory);

  const filteredVideos = activeVideoList
    .slice()
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });

  const handleDeleteDownload = (video: VideoItem) => {
    Alert.alert(
      'Delete Download? 🗑️',
      `Remove "${video.title}" from your downloaded videos to free up storage?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeDownloadedVideo(video.id);
          },
        },
      ]
    );
  };

  const feedItems: HomeFeedItem[] = isPlaylistView
    ? playlists.map((item) => ({ type: 'playlist' as const, item }))
    : filteredVideos.map((item) => ({ type: 'video' as const, item }));

  const handleTabSelected = (tab: ChildTab) => {
    switch (tab) {
      case ChildTab.HOME:
        // already here
        break;
      case ChildTab.EXPLORE:
        navigate(ScreenState.EXPLORE);
        break;
      case ChildTab.SEARCH:
        navigate(ScreenState.SEARCH, { previousScreen: ScreenState.HOME });
        break;
      case ChildTab.PROFILE:
        navigate(ScreenState.PROFILE);
        break;
    }
  };

  const handlePasscodeSuccess = () => {
    setShowPasscodeModal(false);
    setShowTimerDialog(true);
  };

  const handleConfirmExtension = async (extensionMinutes: number) => {
    setShowTimerDialog(false);
    useScreenTimeStore.setState((state) => ({
      remainingMinutes: state.remainingMinutes + extensionMinutes,
      isLocked: false,
    }));
  };

  return (
    <LinearGradient
      colors={
        isDark
          ? ['#0B1120', '#0F172A', '#1E293B']
          : ['#FFBE00', '#FFB703', '#E5641C']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
      testID="kids_home_screen"
    >
      {/* Top Banner: Seamless with gradient */}
      <View
        style={[
          styles.topYellowBanner,
          { backgroundColor: isDark ? '#0F172A' : 'transparent' },
        ]}
      >
        <SafeAreaView edges={['top', 'left', 'right']}>
          <KidsHeader
            remainingMinutes={remainingMinutes}
            onCastPress={() => setShowCastSheet(true)}
            onPolicyPress={() => setShowPolicyDialog(true)}
            onSettingsPress={() => setShowPasscodeModal(true)}
          />

          <KidsCategoryRow
            selectedCategory={selectedCategory}
            onCategorySelected={setSelectedCategory}
          />
        </SafeAreaView>
      </View>

      {/* Content Area */}
      <View style={styles.contentGradient}>
        <FlatList<HomeFeedItem>
          key={isPlaylistView ? 'playlists' : 'videos'}
          data={feedItems}
          keyExtractor={({ item }) => item.id}
          ListHeaderComponent={
            isDownloadsView ? (
              <TouchableOpacity
                style={styles.downloadsManagerHeaderBtn}
                activeOpacity={0.85}
                onPress={() => navigate(ScreenState.DOWNLOADS_MANAGER)}
              >
                <View style={styles.dmHeaderLeft}>
                  <MaterialIcons name="settings-suggest" size={22} color="#0284C7" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.dmHeaderTitle}>Downloads Manager</Text>
                    <Text style={styles.dmHeaderSubtitle}>View active queues, speed & manage storage</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#0284C7" />
              </TouchableOpacity>
            ) : undefined
          }
          renderItem={({ item: entry }) =>
            entry.type === 'playlist' ? (
              <View style={styles.playlistItemWrap}>
                <KidsPlaylistCard
                  playlist={entry.item}
                  fullWidth
                  onClick={() =>
                    navigate(ScreenState.PLAYLIST_DETAILS, {
                      playlistId: entry.item.id,
                      previousScreen: ScreenState.HOME,
                    })
                  }
                />
              </View>
            ) : (
              <KidsVideoCard
                video={entry.item}
                isDownloading={isDownloading(entry.item.id)}
                downloadProgress={downloadProgress[entry.item.id] ?? 0}
                isDownloaded={isDownloaded(entry.item.id)}
                onMoreClick={(vid) => setSelectedOptionsVideo(vid)}
                onDeleteDownload={
                  isDownloadsView || isDownloaded(entry.item.id)
                    ? () => handleDeleteDownload(entry.item)
                    : undefined
                }
                onClick={() =>
                  navigate(ScreenState.PLAYER, {
                    videoId: entry.item.id,
                    previousScreen: ScreenState.HOME,
                    sourceVideoIds: activeVideoList.map((video) => video.id),
                    isDownloads: isDownloadsView || !isBackendConnected,
                    category: selectedCategory,
                  })
                }
              />
            )
          }
          numColumns={isPlaylistView ? 2 : 1}
          columnWrapperStyle={isPlaylistView ? styles.playlistRow : undefined}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          decelerationRate={0.92}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <KidsEmptyState
                title={
                  isPlaylistView
                    ? 'No playlists available yet'
                    : isDownloadsView
                    ? 'No downloaded videos yet'
                    : 'No videos available yet'
                }
                subtitle={
                  isPlaylistView
                    ? 'There are no playlists added yet. Ask mom or dad to whitelist safe playlists!'
                    : isDownloadsView
                    ? 'Tap the download button on any video while online to watch it anytime, anywhere without internet! 🎈'
                    : 'There are no videos under this category yet. Check back soon!'
                }
              />
            </View>
          }
        />
      </View>

      {/* Bottom Navigation */}
      <KidsBottomNavigation
        selectedTab={ChildTab.HOME}
        profileEmoji={profileEmoji}
        onTabSelected={handleTabSelected}
      />

      {/* Cast Device Bottom Sheet (Screenshot 2) */}
      <KidsCastSheet
        visible={showCastSheet}
        onDismiss={() => setShowCastSheet(false)}
      />

      {/* Safety Policy Modal (Shield icon) */}
      <KidsPolicyDialog
        visible={showPolicyDialog}
        onDismiss={() => setShowPolicyDialog(false)}
      />

      {/* "Parents only" Passcode Modal (Screenshot 3) */}
      <ParentsPasscodeModal
        visible={showPasscodeModal}
        onDismiss={() => setShowPasscodeModal(false)}
        onSuccess={handlePasscodeSuccess}
      />

      {/* Screen Time Timer Dialog */}
      <ParentExtensionDialog
        visible={showTimerDialog}
        onDismiss={() => setShowTimerDialog(false)}
        onConfirmExtension={handleConfirmExtension}
      />

      {/* 3-Dots Video Options Sheet */}
      <Modal
        visible={selectedOptionsVideo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOptionsVideo(null)}
      >
        <TouchableOpacity
          style={styles.optionsBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedOptionsVideo(null)}
        >
          <View style={styles.optionsSheet}>
            {selectedOptionsVideo && (
              <>
                <View style={styles.optionsHeader}>
                  <Text style={styles.optionsTitle} numberOfLines={1}>
                    {selectedOptionsVideo.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedOptionsVideo(null)}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Block Video Option */}
                <TouchableOpacity
                  style={[styles.optionsRow, { backgroundColor: '#FEF2F2' }]}
                  onPress={() => {
                    const vid = selectedOptionsVideo;
                    Alert.alert(
                      'Block Video 🚫',
                      `Hide "${vid.title}" from your feed? Parents can unblock it later in the parent panel.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Block Video',
                          style: 'destructive',
                          onPress: async () => {
                            setSelectedOptionsVideo(null);
                            await blockVideo(vid.id);
                            Alert.alert('Video Blocked', 'This video has been hidden from your feed.');
                          },
                        },
                      ]
                    );
                  }}
                >
                  <View style={[styles.optionsIconWrap, { backgroundColor: '#FEE2E2' }]}>
                    <MaterialIcons name="block" size={20} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionsRowTitle, { color: '#DC2626' }]}>Block Video</Text>
                    <Text style={styles.optionsRowSub}>Hide this video from feed</Text>
                  </View>
                </TouchableOpacity>

                {/* Download / Delete Download */}
                <TouchableOpacity
                  style={styles.optionsRow}
                  onPress={async () => {
                    const vid = selectedOptionsVideo;
                    setSelectedOptionsVideo(null);
                    if (isDownloaded(vid.id)) {
                      handleDeleteDownload(vid);
                    } else {
                      await startVideoDownload(vid);
                    }
                  }}
                >
                  <View style={[styles.optionsIconWrap, { backgroundColor: '#E0F2FE' }]}>
                    <MaterialIcons
                      name={isDownloaded(selectedOptionsVideo.id) ? 'delete-outline' : 'cloud-download'}
                      size={20}
                      color="#0284C7"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionsRowTitle}>
                      {isDownloaded(selectedOptionsVideo.id) ? 'Delete Download' : 'Download Video'}
                    </Text>
                    <Text style={styles.optionsRowSub}>
                      {isDownloaded(selectedOptionsVideo.id) ? 'Free up device storage' : 'Save for offline watching'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topYellowBanner: {
    backgroundColor: '#FFBE00',
    paddingBottom: 8,
  },
  contentGradient: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    flexGrow: 1,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  horizontalScroll: {
    paddingHorizontal: 4,
    gap: 12,
  },
  playlistItemWrap: {
    flex: 1,
  },
  playlistRow: {
    gap: 12,
    marginBottom: 8,
  },
  emptyWrap: {
    marginTop: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadsManagerHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dmHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dmHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  dmHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  optionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
    marginRight: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  optionsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsRowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  optionsRowSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
});