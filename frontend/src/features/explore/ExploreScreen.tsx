// src/features/explore/ExploreScreen.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { KidsHeader } from '../../components/layout/KidsHeader';
import { KidsBottomNavigation } from '../../components/layout/KidsBottomNavigation';
import { KidsVideoCard } from '../../components/ui/KidsVideoCard';
import { KidsChannelCard } from '../../components/ui/KidsChannelCard';
import { KidsPlaylistCard } from '../../components/ui/KidsPlaylistCard';
import { KidsEmptyState } from '../../components/ui/KidsStatusViews';
import { KidsToasterIllustration } from '../../components/ui/KidsToasterIllustration';
import { KidsCastSheet } from '../../components/layout/KidsCastSheet';
import { KidsPolicyDialog } from '../../components/layout/KidsPolicyDialog';
import { ParentsPasscodeModal } from '../parental/ParentsPasscodeModal';
import { ParentExtensionDialog } from '../parental/ParentExtensionDialog';

import { useContentStore } from '../../store/contentStore';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { useKidsTheme } from '../../theme/ThemeProvider';
import { ChildTab, ScreenState } from '../../types/navigation';
import { navigate } from '../../app/navigation/navigationRef';

export const ExploreScreen: React.FC = () => {
  const { isDark, colors: themeColors } = useKidsTheme();

  // Dialog and bottom sheet states
  const [showCastSheet, setShowCastSheet] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [showTimerDialog, setShowTimerDialog] = useState(false);

  // Active Tab: 'watchAgain' | 'shared' (Image 3)
  const [activeTab, setActiveTab] = useState<'watchAgain' | 'shared'>('watchAgain');

  const videos = useContentStore((s) => s.approvedVideos);
  const channels = useContentStore((s) => s.approvedChannels);
  const playlists = useContentStore((s) => s.approvedPlaylists);
  const currentProfile = useContentStore((s) => s.selectedProfile);
  const watchedVideoIds = useContentStore((s) => s.watchedVideoIds);
  const downloadedVideos = useContentStore((s) => s.downloadedVideos);

  // Derive watched videos in reverse-chronological order for "Watch it again"
  const watchedVideos = useMemo(() => {
    return watchedVideoIds
      .map((id) => videos.find((v) => v.id === id) || downloadedVideos.find((v) => v.id === id))
      .filter((v): v is typeof videos[0] => Boolean(v && !v.isBlocked));
  }, [watchedVideoIds, videos, downloadedVideos]);

  const remainingMinutes = useScreenTimeStore((s) => s.remainingMinutes);

  const profileEmoji = currentProfile?.avatarEmoji ?? '🦁';

  const handleTabSelected = (tab: ChildTab) => {
    switch (tab) {
      case ChildTab.HOME:
        navigate(ScreenState.HOME);
        break;
      case ChildTab.EXPLORE:
        // already here
        break;
      case ChildTab.SEARCH:
        navigate(ScreenState.SEARCH, { previousScreen: ScreenState.EXPLORE });
        break;
      case ChildTab.PROFILE:
        navigate(ScreenState.PROFILE);
        break;
    }
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
      testID="explore_screen"
    >
      {/* Top Banner: Dark Slate in dark mode, Yellow in light mode */}
      <View
        style={[
          styles.topBanner,
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

          {/* Dual Toggle Pills: Watch it again & Shared (Image 3) */}
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[
                styles.tabPill,
                activeTab === 'watchAgain'
                  ? styles.tabPillActive
                  : isDark
                  ? styles.tabPillInactiveDark
                  : styles.tabPillInactiveLight,
              ]}
              onPress={() => setActiveTab('watchAgain')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'watchAgain' }}
            >
              <MaterialIcons
                name="history"
                size={22}
                color={
                  activeTab === 'watchAgain'
                    ? '#FFFFFF'
                    : isDark
                    ? '#F1F5F9'
                    : '#000000'
                }
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === 'watchAgain'
                    ? styles.tabPillTextActive
                    : isDark
                    ? styles.tabPillTextInactiveDark
                    : styles.tabPillTextInactiveLight,
                ]}
              >
                Watch it again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabPill,
                activeTab === 'shared'
                  ? styles.tabPillActive
                  : isDark
                  ? styles.tabPillInactiveDark
                  : styles.tabPillInactiveLight,
              ]}
              onPress={() => setActiveTab('shared')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'shared' }}
            >
              <MaterialIcons
                name="group"
                size={22}
                color={
                  activeTab === 'shared'
                    ? '#FFFFFF'
                    : isDark
                    ? '#F1F5F9'
                    : '#000000'
                }
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === 'shared'
                    ? styles.tabPillTextActive
                    : isDark
                    ? styles.tabPillTextInactiveDark
                    : styles.tabPillTextInactiveLight,
                ]}
              >
                Shared
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Content Area */}
      <View style={styles.contentGradient}>
        {activeTab === 'watchAgain' ? (
          watchedVideos.length === 0 ? (
            /* Watch it again: Empty state matching Image 3 */
            <ScrollView
              contentContainerStyle={styles.watchAgainContent}
              showsVerticalScrollIndicator={false}
              decelerationRate={0.92}
            >
              <View style={styles.emptyToasterContainer}>
                <KidsToasterIllustration />
                <Text style={styles.emptyTitle}>
                  You haven't watched anything yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  Start watching videos and they'll show up here
                </Text>

                <TouchableOpacity
                  style={styles.homeBtn}
                  onPress={() => navigate(ScreenState.HOME)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Home"
                >
                  <MaterialIcons name="home" size={22} color="#FFFFFF" />
                  <Text style={styles.homeBtnText}>Home</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* Watch it again: List of watched videos */
            <FlatList
              data={watchedVideos}
              keyExtractor={(video) => video.id}
              renderItem={({ item: video }) => (
                <KidsVideoCard
                  video={video}
                  onClick={() =>
                    navigate(ScreenState.PLAYER, {
                      videoId: video.id,
                      previousScreen: ScreenState.EXPLORE,
                    })
                  }
                />
              )}
              ListHeaderComponent={
                <View style={styles.sectionHeaderRow}>
                  <MaterialIcons
                    name="history"
                    size={22}
                    color={isDark ? '#F8FAFC' : '#000000'}
                  />
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: isDark ? '#F8FAFC' : '#000000' },
                    ]}
                  >
                    Watch it again ({watchedVideos.length})
                  </Text>
                </View>
              }
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              decelerationRate={0.92}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={7}
              removeClippedSubviews
            />
          )
        ) : (
          /* Shared Tab: Approved Playlists, Channels, Videos */
          <FlatList
            data={videos}
            keyExtractor={(video) => video.id}
            renderItem={({ item: video }) => (
              <KidsVideoCard
                video={video}
                onClick={() =>
                  navigate(ScreenState.PLAYER, {
                    videoId: video.id,
                    previousScreen: ScreenState.EXPLORE,
                  })
                }
              />
            )}
            ListHeaderComponent={
              <>
                {playlists.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <MaterialIcons
                        name="video-library"
                        size={20}
                        color={themeColors.kidsSkyBlue}
                      />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: isDark ? '#F8FAFC' : '#1E293B' },
                        ]}
                      >
                        Approved Playlists ({playlists.length})
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalScroll}
                    >
                      {playlists.map((playlist) => (
                        <KidsPlaylistCard
                          key={playlist.id}
                          playlist={playlist}
                          onClick={() =>
                            navigate(ScreenState.PLAYLIST_DETAILS, {
                              playlistId: playlist.id,
                              previousScreen: ScreenState.EXPLORE,
                            })
                          }
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
                {channels.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <MaterialIcons
                        name="subscriptions"
                        size={20}
                        color="#E52E2E"
                      />
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: isDark ? '#F8FAFC' : '#1E293B' },
                        ]}
                      >
                        Favorite Channels ({channels.length})
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalScroll}
                    >
                      {channels.map((channel) => (
                        <KidsChannelCard
                          key={channel.id}
                          channel={channel}
                          onClick={() =>
                            navigate(ScreenState.CHANNEL_DETAILS, {
                              channelId: channel.id,
                              previousScreen: ScreenState.EXPLORE,
                            })
                          }
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
                <View style={styles.sectionHeaderRow}>
                  <MaterialIcons
                    name="play-circle-filled"
                    size={20}
                    color={isDark ? '#38BDF8' : '#0284C7'}
                  />
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: isDark ? '#F8FAFC' : '#1E293B' },
                    ]}
                  >
                    Approved Videos For You ({videos.length})
                  </Text>
                </View>
              </>
            }
            ListEmptyComponent={
              <KidsEmptyState
                title="Your library is waiting!"
                subtitle="Ask your parents to approve videos from the Parent Panel, and they will appear right here!"
              />
            }
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            decelerationRate={0.92}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={7}
            removeClippedSubviews
          />
        )}
      </View>

      {/* Bottom Navigation */}
      <KidsBottomNavigation
        selectedTab={ChildTab.EXPLORE}
        profileEmoji={profileEmoji}
        onTabSelected={handleTabSelected}
      />

      {/* Cast Device Bottom Sheet */}
      <KidsCastSheet
        visible={showCastSheet}
        onDismiss={() => setShowCastSheet(false)}
      />

      {/* Safety Policy Modal */}
      <KidsPolicyDialog
        visible={showPolicyDialog}
        onDismiss={() => setShowPolicyDialog(false)}
      />

      {/* Passcode Modal */}
      <ParentsPasscodeModal
        visible={showPasscodeModal}
        onDismiss={() => setShowPasscodeModal(false)}
        onSuccess={() => {
          setShowPasscodeModal(false);
          setShowTimerDialog(true);
        }}
      />

      {/* Timer Dialog */}
      <ParentExtensionDialog
        visible={showTimerDialog}
        onDismiss={() => setShowTimerDialog(false)}
        onConfirmExtension={handleConfirmExtension}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBanner: {
    paddingBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  tabPillActive: {
    backgroundColor: '#000000',
  },
  tabPillInactiveLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  tabPillInactiveDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabPillText: {
    fontSize: 15,
    fontWeight: '900',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabPillTextInactiveLight: {
    color: '#000000',
  },
  tabPillTextInactiveDark: {
    color: '#F1F5F9',
  },
  contentGradient: {
    flex: 1,
  },
  watchAgainContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  emptyToasterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 28,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 280,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 28,
    marginTop: 22,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    flexGrow: 1,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  horizontalScroll: {
    paddingHorizontal: 4,
    gap: 12,
  },
});