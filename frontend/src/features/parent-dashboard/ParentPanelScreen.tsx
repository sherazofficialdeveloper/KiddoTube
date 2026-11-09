import React, { useCallback, useEffect, useState } from 'react';
import { FontText as Text } from '../../components/ui/FontText';
import {
  Alert,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { KiddoTubeLogo } from '../../components/branding';
import { Api } from '../../services/api';
import { useParentAdminStore } from '../../store/parentAdminStore';
import {
  resetToChildLogin,
} from '../../app/navigation/navigationRef';
import { ParentNavSection } from '../../types/navigation';
import { VideoCategory } from '../../types/models';
import type {
  ChannelItem,
  PlaylistItem,
  VideoItem,
} from '../../types/models';
import type { MaterialIconsIconName } from 'react-native-vector-icons/MaterialIcons';
import type {
  ChannelItemDto,
  ChildDetailDto,
  PlaylistItemDto,
  VideoItemDto,
} from '../../types/api';
import { ParentDashboardView } from './ParentDashboardView';
import { ParentChildrenView } from './ParentChildrenView';
import { ParentContentView } from './ParentContentView';
import { ParentScreenTimeView } from './ParentScreenTimeView';
import { ParentPinManagementView } from './ParentPinManagementView';
import { AddChildDialog } from './dialogs/AddChildDialog';
import { AddVideoView } from './AddVideoView';
import { AddChannelDialog } from './dialogs/AddChannelDialog';
import { AddPlaylistDialog } from './dialogs/AddPlaylistDialog';
import { ResetPasswordDialog } from './dialogs/ResetPasswordDialog';
import { ParentProfileView } from './ParentProfileView';
import { ParentAppearanceView } from './ParentAppearanceView';

interface ApprovedContent {
  videos: VideoItem[];
  channels: ChannelItem[];
  playlists: PlaylistItem[];
}

const initialContent: ApprovedContent = {
  videos: [],
  channels: [],
  playlists: [],
};

const toVideo = (video: VideoItemDto): VideoItem => ({
  id: video.id,
  youtubeId: video.youtubeId,
  title: video.title,
  channelTitle: video.channelTitle,
  thumbnailUrl: video.thumbnailUrl,
  durationText: video.durationText,
  category:
    Object.values(VideoCategory).find(
      (category) => category === video.category.toUpperCase()
    ) ?? VideoCategory.ALL,
  description: video.description,
  createdAt: video.createdAt,
  childIds: video.childIds,
  isBlocked: video.isBlocked,
});

const toChannel = (channel: ChannelItemDto): ChannelItem => ({
  id: channel.id,
  title: channel.title,
  avatarUrl: channel.avatarUrl,
  videoCount: channel.videoCount,
  colorAccentHex: channel.colorAccentHex,
  description: channel.description,
  childIds: channel.childIds,
  isBlocked: channel.isBlocked,
});

const toPlaylist = (playlist: PlaylistItemDto): PlaylistItem => ({
  id: playlist.id,
  title: playlist.title,
  channelTitle: playlist.channelTitle,
  thumbnailUrl: playlist.thumbnailUrl,
  videoCount: playlist.videoCount,
  videoIds: playlist.videoIds,
  childIds: playlist.childIds,
  isBlocked: playlist.isBlocked,
});

const sections: Array<{
  section: ParentNavSection;
  label: string;
  icon: MaterialIconsIconName;
}> = [
  { section: ParentNavSection.DASHBOARD, label: 'Home', icon: 'home' },
  { section: ParentNavSection.CHILDREN, label: 'Children', icon: 'people' },
  { section: ParentNavSection.CONTENT, label: 'Media', icon: 'video-library' },
  { section: ParentNavSection.SCREEN_TIME, label: 'Time', icon: 'timer' },
];

export const ParentPanelScreen: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(
    ParentNavSection.DASHBOARD
  );
  const [content, setContent] = useState(initialContent);
  const [showAddChild, setShowAddChild] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [childToReset, setChildToReset] = useState<ChildDetailDto | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [childPasswordRevision, setChildPasswordRevision] = useState(0);

  const parentDashboard = useParentAdminStore((state) => state.parentDashboard);
  const parentAccount = useParentAdminStore((state) => state.parentAccount);
  const parentToken = useParentAdminStore((state) => state.parentToken);
  const parentChildren = useParentAdminStore((state) => state.parentChildren);
  const fetchParentDashboard = useParentAdminStore(
    (state) => state.fetchParentDashboard
  );
  const fetchParentChildren = useParentAdminStore(
    (state) => state.fetchParentChildren
  );
  const createChild = useParentAdminStore((state) => state.createChild);
  const updateDailyLimit = useParentAdminStore(
    (state) => state.updateDailyLimit
  );
  const updateChildDailyLimit = useParentAdminStore(
    (state) => state.updateChildDailyLimit
  );
  const updateParentPin = useParentAdminStore(
    (state) => state.updateParentPin
  );
  const updateParentProfile = useParentAdminStore(
    (state) => state.updateParentProfile
  );
  const changeParentPassword = useParentAdminStore(
    (state) => state.changeParentPassword
  );
  const logoutParent = useParentAdminStore((state) => state.logoutParent);
  const resetChildPassword = useParentAdminStore(
    (state) => state.resetChildPassword
  );
  const getChildPassword = useParentAdminStore(
    (state) => state.getChildPassword
  );
  const deleteChild = useParentAdminStore((state) => state.deleteChild);
  const addVideo = useParentAdminStore((state) => state.addVideo);
  const removeVideo = useParentAdminStore((state) => state.removeVideo);
  const addChannel = useParentAdminStore((state) => state.addChannel);
  const removeChannel = useParentAdminStore((state) => state.removeChannel);
  const addPlaylist = useParentAdminStore((state) => state.addPlaylist);
  const removePlaylist = useParentAdminStore((state) => state.removePlaylist);

  const refreshContent = useCallback(async () => {
    try {
      const response = await Api.getApprovedContent();
      if (!response.success) {
        throw new Error('Unable to load approved content.');
      }
      setContent({
        videos: response.videos.map(toVideo),
        channels: response.channels.map(toChannel),
        playlists: response.playlists.map(toPlaylist),
      });
    } catch (error) {
      Alert.alert(
        'Content unavailable',
        error instanceof Error ? error.message : 'Unable to load approved content.'
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchParentDashboard(),
      fetchParentChildren(),
      refreshContent(),
    ]);
  }, [fetchParentChildren, fetchParentDashboard, refreshContent]);

  useEffect(() => {
    if (!parentToken) return;
    refresh();
  }, [parentToken, refresh]);

  const showActionError = (title: string, result: { success: boolean; error?: string }) => {
    if (!result.success) {
      Alert.alert(title, result.error ?? 'Please try again.');
    }
  };

  const handleDeleteChild = (child: ChildDetailDto) => {
    Alert.alert(
      'Delete child profile',
      `Delete ${child.displayName}'s profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteChild(child.id);
            showActionError('Unable to delete profile', result);
            if (result.success) {
              await refreshContent();
            }
          },
        },
      ]
    );
  };

  const handleRemoveContent = async (
    action: () => Promise<{ success: boolean; error?: string }>,
    title: string
  ) => {
    const result = await action();
    showActionError(title, result);
    if (result.success) {
      await refreshContent();
    }
  };

  const dailyLimit = parentDashboard?.stats.dailyLimitMinutes ?? 60;

  const handleLogout = () => {
    setIsMenuVisible(false);
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logoutParent();
          resetToChildLogin();
        },
      },
    ]);
  };

  // If in Add Video mode, render full page AddVideoView
  if (isAddingVideo) {
    return (
      <SafeAreaView style={styles.root} testID="parent_add_video_screen">
        <AddVideoView
          children={parentChildren}
          onBack={() => setIsAddingVideo(false)}
          onAddVideo={async (title, channel, youtubeId, category, childIds) => {
            const result = await addVideo(title, channel, youtubeId, category, childIds);
            if (result.success) {
              await refreshContent();
            }
            return result;
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} testID="parent_panel_screen">
      {/* Light Branded Header */}
      <View style={styles.topBar}>
        <KiddoTubeLogo size="small" showTagline={false} />
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Parent Dashboard</Text>
          <Text style={styles.subtitle}>
            • Hand-picked videos
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {currentSection === ParentNavSection.DASHBOARD && (
          <ParentDashboardView
            dashboardData={parentDashboard}
            childrenCount={parentChildren.length}
            onNavigate={setCurrentSection}
            onRefresh={refresh}
          />
        )}
        {currentSection === ParentNavSection.CHILDREN && (
          <ParentChildrenView
            children={parentChildren}
            passwordRevision={childPasswordRevision}
            onAddChildClick={() => setShowAddChild(true)}
            onGetChildPassword={getChildPassword}
            onResetPasswordClick={setChildToReset}
            onDeleteChildClick={handleDeleteChild}
          />
        )}
        {currentSection === ParentNavSection.CONTENT && (
          <ParentContentView
            {...content}
            children={parentChildren}
            onAddVideoClick={() => setIsAddingVideo(true)}
            onAddChannelClick={() => setShowAddChannel(true)}
            onAddPlaylistClick={() => setShowAddPlaylist(true)}
            onRemoveVideo={(video) =>
              handleRemoveContent(
                () => removeVideo(video.id),
                'Unable to remove video'
              )
            }
            onRemoveChannel={(channel) =>
              handleRemoveContent(
                () => removeChannel(channel.id),
                'Unable to remove channel'
              )
            }
            onRemovePlaylist={(playlist) =>
              handleRemoveContent(
                () => removePlaylist(playlist.id),
                'Unable to remove playlist'
              )
            }
            onRemoveMultipleVideos={async (videoIds) => {
              for (const id of videoIds) {
                await removeVideo(id);
              }
              await refreshContent();
            }}
            onRemoveMultipleChannels={async (channelIds) => {
              for (const id of channelIds) {
                await removeChannel(id);
              }
              await refreshContent();
            }}
            onRemoveMultiplePlaylists={async (playlistIds) => {
              for (const id of playlistIds) {
                await removePlaylist(id);
              }
              await refreshContent();
            }}
          />
        )}
        {currentSection === ParentNavSection.SCREEN_TIME && (
          <ParentScreenTimeView
            currentLimit={dailyLimit}
            children={parentChildren}
            onSaveDailyLimit={async (limit) => {
              showActionError(
                'Unable to update daily limit',
                await updateDailyLimit(limit)
              );
            }}
            onSaveChildDailyLimit={async (childId, limit) => {
              showActionError(
                'Unable to update child limit',
                await updateChildDailyLimit(childId, limit)
              );
            }}
            onRefresh={refresh}
          />
        )}
        {currentSection === ParentNavSection.PIN && (
          <ParentPinManagementView
            onUpdatePin={async (currentPin, newPin) => {
              showActionError(
                'Unable to update PIN',
                await updateParentPin(currentPin, newPin)
              );
            }}
          />
        )}
        {currentSection === ParentNavSection.APPEARANCE && (
          <ParentAppearanceView />
        )}
        {currentSection === ParentNavSection.ACCOUNT && (
          <ParentProfileView
            account={parentAccount}
            onSaveProfile={updateParentProfile}
            onChangePassword={changeParentPassword}
          />
        )}
      </View>

      {/* Light Branded Bottom Navigation */}
      <View style={styles.bottomNav}>
        {sections.map(({ section, label, icon }) => {
          const isSelected = currentSection === section;
          return (
            <TouchableOpacity
              key={section}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setCurrentSection(section)}
              style={styles.navItem}
            >
              <MaterialIcons
                name={icon}
                size={24}
                color={isSelected ? '#E52E2E' : '#000000'}
              />
              <Text
                style={[
                  styles.navLabel,
                  isSelected
                    ? styles.navLabelSelected
                    : styles.navLabelUnselected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          onPress={() => setIsMenuVisible(true)}
          style={styles.navItem}
        >
          <MaterialIcons name="menu" size={24} color="#000000" />
          <Text style={[styles.navLabel, styles.navLabelUnselected]}>Menu</Text>
        </TouchableOpacity>
      </View>

      {/* Parent Drawer Menu (Single icons, clean light UI) */}
      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
          <View style={styles.drawerBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.drawer}>
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>Parent Menu</Text>
                  <View style={styles.accountBadge}>
                    <MaterialIcons name="account-circle" size={28} color="#0284C7" />
                    <View style={styles.accountTextCol}>
                      <Text style={styles.drawerAccount} numberOfLines={1}>
                        {parentAccount?.username || parentAccount?.displayName || 'Family Account'}
                      </Text>
                      {parentAccount?.email ? (
                        <Text style={styles.drawerAccountEmail} numberOfLines={1}>
                          {parentAccount.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setIsMenuVisible(false);
                    setCurrentSection(ParentNavSection.ACCOUNT);
                  }}
                >
                  <MaterialIcons name="person" size={24} color="#0284C7" />
                  <Text style={styles.drawerItemText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setIsMenuVisible(false);
                    setCurrentSection(ParentNavSection.PIN);
                  }}
                >
                  <MaterialIcons name="vpn-key" size={24} color="#F59E0B" />
                  <Text style={styles.drawerItemText}>Security PIN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    setIsMenuVisible(false);
                    setCurrentSection(ParentNavSection.APPEARANCE);
                  }}
                >
                  <MaterialIcons name="palette" size={24} color="#8B5CF6" />
                  <Text style={styles.drawerItemText}>Appearance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.drawerItem, styles.logoutItem]}
                  onPress={handleLogout}
                >
                  <MaterialIcons name="logout" size={24} color="#E52E2E" />
                  <Text style={[styles.drawerItemText, styles.logoutText]}>
                    Log out
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AddChildDialog
        visible={showAddChild}
        onDismiss={() => setShowAddChild(false)}
        onConfirm={(...args) => createChild(...args)}
      />
      <AddChannelDialog
        visible={showAddChannel}
        onDismiss={() => setShowAddChannel(false)}
        children={parentChildren}
        onConfirm={async (title, channelUrlOrId, description, category, childIds) => {
          const result = await addChannel(title, channelUrlOrId, description, category, childIds);
          showActionError('Unable to add channel', result);
          if (result.success) await refreshContent();
        }}
      />
      <AddPlaylistDialog
        visible={showAddPlaylist}
        onDismiss={() => setShowAddPlaylist(false)}
        children={parentChildren}
        onConfirm={async (title, playlistId, channelTitle, category, childIds) => {
          const result = await addPlaylist(title, playlistId, channelTitle, category, childIds);
          showActionError('Unable to add playlist', result);
          if (result.success) await refreshContent();
        }}
      />
      <ResetPasswordDialog
        visible={childToReset !== null}
        childName={childToReset?.displayName ?? ''}
        onDismiss={() => setChildToReset(null)}
        onConfirm={async (password) => {
          if (!childToReset) return;
          const result = await resetChildPassword(childToReset.id, password);
          showActionError('Unable to reset password', result);
          if (result.success) {
            setChildPasswordRevision((revision) => revision + 1);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleBlock: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  drawerBackdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawer: {
    width: 300,
    maxWidth: '82%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    elevation: 16,
  },
  drawerHeader: {
    marginBottom: 10,
  },
  drawerTitle: { color: '#000000', fontSize: 24, fontWeight: '900' },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  accountTextCol: {
    flex: 1,
  },
  drawerAccount: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
  },
  drawerAccountEmail: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    gap: 14,
  },
  drawerItemText: { color: '#000000', fontSize: 17, fontWeight: '900' },
  logoutItem: { marginTop: 12, borderBottomWidth: 0 },
  logoutText: { color: '#E52E2E' },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 13,
    marginTop: 3,
    fontFamily: 'Nunito-Bold',
    fontWeight: '800',
  },
  navLabelSelected: {
    color: '#E52E2E',
    fontWeight: '900',
  },
  navLabelUnselected: {
    color: '#000000',
    fontWeight: '800',
  },
});