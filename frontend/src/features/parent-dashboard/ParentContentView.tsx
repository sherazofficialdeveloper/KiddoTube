// src/features/parent-dashboard/ParentContentView.tsx
import { FontText as Text } from '../../components/ui/FontText';

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { MaterialIconsIconName } from 'react-native-vector-icons/MaterialIcons';
import { hexLongToColor, getInitial } from '../../utils/color';
import type {
  ChannelItem,
  PlaylistItem,
  VideoItem,
} from '../../types/models';
import type { ChildDetailDto } from '../../types/api';
import {
  ContentFilterModal,
  FilterModalType,
  FilterSelection,
} from '../../components/ui/ContentFilterModal';
import { matchesContentDateFilter } from '../../utils/contentDate';
import { buildYoutubePlayerHtml } from '../../utils/youtube';
import { useContentStore } from '../../store/contentStore';

/**
 * ParentContentView
 * Approved media whitelist management for parents.
 *
 * Features:
 * - 3 tabs: Videos, Channels, Playlists
 * - Sorting by: Date (Newest/Oldest), Month, Year
 * - Individual item checkboxes
 * - Single "Delete (N)" action button when items are selected
 * - No "Delete All" or "Select All" buttons as per specifications
 * - Large, bold typography and official brand colors
 */

interface ParentContentViewProps {
  videos: VideoItem[];
  channels: ChannelItem[];
  playlists: PlaylistItem[];
  children: ChildDetailDto[];
  onAddVideoClick: () => void;
  onAddChannelClick: () => void;
  onAddPlaylistClick: () => void;
  onRemoveVideo: (video: VideoItem) => Promise<void> | void;
  onRemoveChannel: (ch: ChannelItem) => Promise<void> | void;
  onRemovePlaylist: (pl: PlaylistItem) => Promise<void> | void;
  onRemoveMultipleVideos?: (videoIds: string[]) => Promise<void>;
  onRemoveMultipleChannels?: (channelIds: string[]) => Promise<void>;
  onRemoveMultiplePlaylists?: (playlistIds: string[]) => Promise<void>;
}

type SortCriteria = 'date_desc' | 'date_asc' | 'month' | 'year';

export const ParentContentView: React.FC<ParentContentViewProps> = ({
  videos,
  channels,
  playlists,
  children,
  onAddVideoClick,
  onAddChannelClick,
  onAddPlaylistClick,
  onRemoveVideo,
  onRemoveChannel,
  onRemovePlaylist,
  onRemoveMultipleVideos,
  onRemoveMultipleChannels,
  onRemoveMultiplePlaylists,
}) => {
  const audienceLabel = (childIds?: string[]) => {
    if (!childIds?.length) return 'All children';
    const names = childIds
      .map((id) => children.find((child) => child.id === id)?.displayName)
      .filter((name): name is string => Boolean(name));
    return names.length ? names.join(', ') : 'Selected children';
  };
  const [contentTab, setContentTab] = useState(0); // 0: Videos, 1: Channels, 2: Playlists, 3: Blocked
  const [videoRenderLimit, setVideoRenderLimit] = useState(24);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeSort] = useState<SortCriteria>('date_desc');
  const [filterModalType, setFilterModalType] = useState<FilterModalType>(null);
  const [activeFilterSelection, setActiveFilterSelection] = useState<FilterSelection | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);

  const blockedVideoIds = useContentStore((s) => s.blockedVideoIds);
  const blockedChannelTitles = useContentStore((s) => s.blockedChannelTitles);
  const allRawVideos = useContentStore((s) => s.allRawVideos);
  const unblockVideo = useContentStore((s) => s.unblockVideo);
  const unblockChannel = useContentStore((s) => s.unblockChannel);

  const [selectedChildFilter, setSelectedChildFilter] = useState<string | null>(null);
  const [showChildFilterModal, setShowChildFilterModal] = useState(false);
  const [blockedSubTab, setBlockedSubTab] = useState<'videos' | 'channels'>('videos');

  const currentTabName =
    contentTab === 0 ? 'Videos' : contentTab === 1 ? 'Channels' : contentTab === 2 ? 'Playlists' : 'Blocked';

  const handleTabChange = (tabIndex: number) => {
    setContentTab(tabIndex);
    setSelectedIds(new Set()); // Reset selection on tab switch
    setVideoRenderLimit(24);
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (contentTab === 0 && layoutMeasurement.height + contentOffset.y >= contentSize.height - 600) {
      if (videoRenderLimit < sortedVideos.length) {
        setVideoRenderLimit((prev) => prev + 24);
      }
    }
  };

  const handleAdd = () => {
    if (contentTab === 0) onAddVideoClick();
    else if (contentTab === 1) onAddChannelClick();
    else if (contentTab === 2) onAddPlaylistClick();
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const blockedVideosList = useMemo(() => {
    return blockedVideoIds.map((bid) => {
      const found = allRawVideos.find((v) => v.id === bid);
      if (found) return found;
      return {
        id: bid,
        youtubeId: bid,
        title: `Blocked Video (${bid})`,
        channelTitle: 'Blocked Content',
        thumbnailUrl: `https://img.youtube.com/vi/${bid}/hqdefault.jpg`,
        durationText: '—',
        category: 'ALL',
      } as VideoItem;
    });
  }, [blockedVideoIds, allRawVideos]);

  // Sort raw list based on activeSort & activeFilterSelection
  const sortedVideos = useMemo(() => {
    let list = [...videos];

    if (selectedChildFilter) {
      list = list.filter((v) => v.childIds && v.childIds.includes(selectedChildFilter));
    }

    if (activeFilterSelection) {
      if (activeFilterSelection.type !== 'user') {
        list = list.filter((video) =>
          matchesContentDateFilter(video.createdAt, activeFilterSelection)
        );
      }
    }

    list.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      switch (activeSort) {
        case 'date_desc':
          return dateB - dateA;
        case 'date_asc':
          return dateA - dateB;
        case 'month': {
          const mA = new Date(a.createdAt || 0).getMonth();
          const mB = new Date(b.createdAt || 0).getMonth();
          return mB - mA;
        }
        case 'year': {
          const yA = new Date(a.createdAt || 0).getFullYear();
          const yB = new Date(b.createdAt || 0).getFullYear();
          return yB - yA;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [videos, activeSort, activeFilterSelection, selectedChildFilter]);

  const sortedChannels = useMemo(() => {
    let list = [...channels];
    if (selectedChildFilter) {
      list = list.filter((c) => c.childIds && c.childIds.includes(selectedChildFilter));
    }
    list.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      switch (activeSort) {
        case 'date_desc':
          return dateB - dateA;
        case 'date_asc':
          return dateA - dateB;
        case 'month':
          return new Date(b.createdAt || 0).getMonth() - new Date(a.createdAt || 0).getMonth();
        case 'year':
          return new Date(b.createdAt || 0).getFullYear() - new Date(a.createdAt || 0).getFullYear();
        default:
          return 0;
      }
    });
    return list;
  }, [channels, activeSort, selectedChildFilter]);

  const sortedPlaylists = useMemo(() => {
    let list = [...playlists];
    if (selectedChildFilter) {
      list = list.filter((p) => p.childIds && p.childIds.includes(selectedChildFilter));
    }
    list.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      switch (activeSort) {
        case 'date_desc':
          return dateB - dateA;
        case 'date_asc':
          return dateA - dateB;
        case 'month':
          return new Date(b.createdAt || 0).getMonth() - new Date(a.createdAt || 0).getMonth();
        case 'year':
          return new Date(b.createdAt || 0).getFullYear() - new Date(a.createdAt || 0).getFullYear();
        default:
          return 0;
      }
    });
    return list;
  }, [playlists, activeSort, selectedChildFilter]);

  // Delete single item with confirmation
  const confirmDeleteSingle = (
    item: VideoItem | ChannelItem | PlaylistItem,
    type: 'video' | 'channel' | 'playlist'
  ) => {
    Alert.alert(
      `Delete ${type}`,
      `Remove "${item.title}" from your child's approved whitelist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (type === 'video') await onRemoveVideo(item as VideoItem);
            else if (type === 'channel') await onRemoveChannel(item as ChannelItem);
            else await onRemovePlaylist(item as PlaylistItem);

            const next = new Set(selectedIds);
            next.delete(item.id);
            setSelectedIds(next);
          },
        },
      ]
    );
  };

  // Delete Selected items with single button
  const confirmDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    Alert.alert(
      `Delete Selected (${count})`,
      `Are you sure you want to remove ${count} selected ${currentTabName.toLowerCase()} from whitelist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete (${count})`,
          style: 'destructive',
          onPress: async () => {
            const idsToDelete = Array.from(selectedIds);
            if (contentTab === 0) {
              if (onRemoveMultipleVideos) {
                await onRemoveMultipleVideos(idsToDelete);
              } else {
                for (const id of idsToDelete) {
                  const item = videos.find((v) => v.id === id);
                  if (item) await onRemoveVideo(item);
                }
              }
            } else if (contentTab === 1) {
              if (onRemoveMultipleChannels) {
                await onRemoveMultipleChannels(idsToDelete);
              } else {
                for (const id of idsToDelete) {
                  const item = channels.find((c) => c.id === id);
                  if (item) await onRemoveChannel(item);
                }
              }
            } else {
              if (onRemoveMultiplePlaylists) {
                await onRemoveMultiplePlaylists(idsToDelete);
              } else {
                for (const id of idsToDelete) {
                  const item = playlists.find((p) => p.id === id);
                  if (item) await onRemovePlaylist(item);
                }
              }
            }
            setSelectedIds(new Set());
          },
        },
      ]
    );
  };

  const addLabel =
    contentTab === 0
      ? 'Add Video'
      : contentTab === 1
      ? 'Add Channel'
      : 'Add Playlist';

  const isSelectionActive = selectedIds.size > 0;

  return (
    <View style={styles.root}>
      {/* Scrollable container with sticky single-line filter bar */}
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        scrollEventThrottle={64}
        onScroll={handleScroll}
      >
        {/* Index 0: Header title & add button that scrolls away */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Approved Media</Text>
            <Text style={styles.subtitle}>
              Only media approved here is visible to kids
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={handleAdd}
            accessibilityLabel={addLabel}
          >
            <MaterialIcons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addText}>{addLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Index 1: STICKY Unified Single-Line Horizontal Filter & Tabs Bar */}
        <View style={styles.stickyBarWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            directionalLockEnabled={true}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            contentContainerStyle={styles.unifiedFilterRow}
          >
            {/* Content Tabs */}
            <TouchableOpacity
              style={[styles.filterPill, contentTab === 0 && styles.filterPillActive]}
              onPress={() => handleTabChange(0)}
            >
              <MaterialIcons
                name="movie"
                size={16}
                color={contentTab === 0 ? '#FFFFFF' : '#000000'}
              />
              <Text style={[styles.filterPillText, contentTab === 0 && styles.filterPillTextActive]}>
                Videos ({videos.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, contentTab === 1 && styles.filterPillActive]}
              onPress={() => handleTabChange(1)}
            >
              <MaterialIcons
                name="subscriptions"
                size={16}
                color={contentTab === 1 ? '#FFFFFF' : '#000000'}
              />
              <Text style={[styles.filterPillText, contentTab === 1 && styles.filterPillTextActive]}>
                Channels ({channels.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, contentTab === 2 && styles.filterPillActive]}
              onPress={() => handleTabChange(2)}
            >
              <MaterialIcons
                name="playlist-play"
                size={18}
                color={contentTab === 2 ? '#FFFFFF' : '#000000'}
              />
              <Text style={[styles.filterPillText, contentTab === 2 && styles.filterPillTextActive]}>
                Playlists ({playlists.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, contentTab === 3 && styles.filterPillActive]}
              onPress={() => handleTabChange(3)}
            >
              <MaterialIcons
                name="block"
                size={16}
                color={contentTab === 3 ? '#FFFFFF' : '#DC2626'}
              />
              <Text style={[styles.filterPillText, contentTab === 3 && styles.filterPillTextActive]}>
                Blocked ({blockedVideoIds.length + blockedChannelTitles.length})
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.filterDivider} />

            {/* Child Filter */}
            <TouchableOpacity
              style={[styles.filterPill, Boolean(selectedChildFilter) && styles.filterPillActive]}
              onPress={() => setShowChildFilterModal(true)}
            >
              <MaterialIcons
                name="face"
                size={15}
                color={selectedChildFilter ? '#FFFFFF' : '#000000'}
              />
              <Text style={[styles.filterPillText, selectedChildFilter && styles.filterPillTextActive]}>
                {selectedChildFilter
                  ? `Child: ${children.find((c) => c.id === selectedChildFilter)?.displayName || 'Child'}`
                  : 'Child Filter'}
              </Text>
            </TouchableOpacity>

            {/* Date Calendar */}
            <TouchableOpacity
              style={[styles.filterPill, activeFilterSelection?.type === 'date' && styles.filterPillActive]}
              onPress={() => setFilterModalType('date')}
            >
              <MaterialIcons
                name="calendar-today"
                size={14}
                color={activeFilterSelection?.type === 'date' ? '#FFFFFF' : '#000000'}
              />
              <Text style={[styles.filterPillText, activeFilterSelection?.type === 'date' && styles.filterPillTextActive]}>
                Date Calendar
              </Text>
            </TouchableOpacity>

            {/* Month */}
            <TouchableOpacity
              style={[styles.filterPill, activeFilterSelection?.type === 'month' && styles.filterPillActive]}
              onPress={() => setFilterModalType('month')}
            >
              <MaterialIcons
                name="date-range"
                size={14}
                color={activeFilterSelection?.type === 'month' ? '#FFFFFF' : '#000000'}
              />
              <Text style={[styles.filterPillText, activeFilterSelection?.type === 'month' && styles.filterPillTextActive]}>
                Month
              </Text>
            </TouchableOpacity>

            {/* Year */}
            <TouchableOpacity
              style={[styles.filterPill, activeFilterSelection?.type === 'year' && styles.filterPillActive]}
              onPress={() => setFilterModalType('year')}
            >
              <MaterialIcons
                name="event"
                size={14}
                color={activeFilterSelection?.type === 'year' ? '#FFFFFF' : '#000000'}
              />
              <Text style={[styles.filterPillText, activeFilterSelection?.type === 'year' && styles.filterPillTextActive]}>
                Year
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Active Filter Banner */}
        {selectedChildFilter ? (
          <View style={[styles.activeFilterBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={styles.activeFilterLeft}>
              <MaterialIcons name="face" size={18} color="#16A34A" />
              <Text style={[styles.activeFilterText, { color: '#166534' }]}>
                Child: <Text style={styles.activeFilterBold}>{children.find((c) => c.id === selectedChildFilter)?.displayName || 'Selected Child'}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => setSelectedChildFilter(null)}
            >
              <MaterialIcons name="close" size={16} color="#DC2626" />
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {activeFilterSelection ? (
          <View style={styles.activeFilterBanner}>
            <View style={styles.activeFilterLeft}>
              <MaterialIcons name="filter-alt" size={18} color="#0284C7" />
              <Text style={styles.activeFilterText}>
                Active: <Text style={styles.activeFilterBold}>{activeFilterSelection.displayLabel}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => setActiveFilterSelection(null)}
            >
              <MaterialIcons name="close" size={16} color="#DC2626" />
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Single Delete Action Bar */}
        {isSelectionActive && (
          <View style={styles.batchActionBar}>
            <View style={styles.batchInfoRow}>
              <MaterialIcons name="check-circle" size={20} color="#E52E2E" />
              <Text style={styles.batchSelectedText}>
                {selectedIds.size} {currentTabName.toLowerCase()} selected
              </Text>
              <TouchableOpacity
                style={styles.cancelSelectionBtn}
                onPress={handleClearSelection}
              >
                <Text style={styles.cancelSelectionText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteSelectedBtn}
              activeOpacity={0.85}
              onPress={confirmDeleteSelected}
            >
              <MaterialIcons name="delete" size={20} color="#FFFFFF" />
              <Text style={styles.deleteBtnText}>
                Delete ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Videos Tab */}
        {contentTab === 0 && (
          <>
            {sortedVideos.length === 0 ? (
              <EmptyCard
                icon="video-library"
                title="No Approved Videos Yet"
                subtitle="Tap 'Add Video' above to whitelist your first YouTube video."
              />
            ) : (
              sortedVideos.slice(0, videoRenderLimit).map((vid) => {
                const isSelected = selectedIds.has(vid.id);
                return (
                  <TouchableOpacity
                    key={vid.id}
                    style={[styles.listItem, isSelected && styles.listItemSelected]}
                    activeOpacity={0.9}
                    onPress={() => toggleSelectItem(vid.id)}
                  >
                    {/* Select Checkbox */}
                    <TouchableOpacity
                      style={styles.itemCheckboxTouch}
                      onPress={() => toggleSelectItem(vid.id)}
                    >
                      <View
                        style={[
                          styles.itemCheckbox,
                          isSelected && styles.itemCheckboxActive,
                        ]}
                      >
                        {isSelected && (
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.videoPreviewThumb}
                      onPress={(event) => {
                        event.stopPropagation();
                        setPreviewVideo(vid);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Watch ${vid.title}`}
                    >
                      <Image
                        source={{ uri: vid.thumbnailUrl }}
                        style={styles.videoThumb}
                      />
                      <View style={styles.videoPreviewOverlay}>
                        <MaterialIcons
                          name="play-circle-filled"
                          size={30}
                          color="#FFFFFF"
                        />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {vid.title}
                      </Text>
                      <Text style={styles.itemMeta}>
                        📺 {vid.channelTitle || 'Channel'} • {vid.category}
                      </Text>
                      <Text style={styles.audienceMeta}>
                        📅 {vid.createdAt ? new Date(vid.createdAt).toLocaleDateString() : 'Added'} • For: {audienceLabel(vid.childIds)}
                      </Text>
                    </View>

                    {/* Single Delete Button */}
                    <TouchableOpacity
                      style={styles.itemDelete}
                      onPress={() => confirmDeleteSingle(vid, 'video')}
                      accessibilityLabel="Delete video"
                    >
                      <MaterialIcons name="delete" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* Channels Tab */}
        {contentTab === 1 && (
          <>
            {sortedChannels.length === 0 ? (
              <EmptyCard
                icon="subscriptions"
                title="No Approved Channels Yet"
                subtitle="Tap 'Add Channel' above to whitelist a YouTube channel."
              />
            ) : (
              sortedChannels.map((ch) => {
                const isSelected = selectedIds.has(ch.id);
                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[styles.listItem, isSelected && styles.listItemSelected]}
                    activeOpacity={0.9}
                    onPress={() => toggleSelectItem(ch.id)}
                  >
                    {/* Select Checkbox */}
                    <TouchableOpacity
                      style={styles.itemCheckboxTouch}
                      onPress={() => toggleSelectItem(ch.id)}
                    >
                      <View
                        style={[
                          styles.itemCheckbox,
                          isSelected && styles.itemCheckboxActive,
                        ]}
                      >
                        {isSelected && (
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.channelAvatarCircle,
                        { backgroundColor: hexLongToColor(ch.colorAccentHex) },
                      ]}
                    >
                      {ch.avatarUrl ? (
                        <Image
                          source={{ uri: ch.avatarUrl }}
                          style={styles.channelAvatarImg}
                        />
                      ) : (
                        <Text style={styles.channelAvatarText}>
                          {getInitial(ch.title)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{ch.title}</Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {ch.description || 'Approved channel'}
                      </Text>
                      <Text style={styles.audienceMeta}>
                        For: {audienceLabel(ch.childIds)}
                      </Text>
                    </View>

                    {/* Single Delete Button */}
                    <TouchableOpacity
                      style={styles.itemDelete}
                      onPress={() => confirmDeleteSingle(ch, 'channel')}
                      accessibilityLabel="Delete channel"
                    >
                      <MaterialIcons name="delete" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* Playlists Tab */}
        {contentTab === 2 && (
          <>
            {sortedPlaylists.length === 0 ? (
              <EmptyCard
                icon="subscriptions"
                title="No Approved Playlists Yet"
                subtitle="Tap 'Add Playlist' above to approve a YouTube playlist collection."
              />
            ) : (
              sortedPlaylists.map((pl) => {
                const isSelected = selectedIds.has(pl.id);
                return (
                  <TouchableOpacity
                    key={pl.id}
                    style={[styles.listItem, isSelected && styles.listItemSelected]}
                    activeOpacity={0.9}
                    onPress={() => toggleSelectItem(pl.id)}
                  >
                    {/* Select Checkbox */}
                    <TouchableOpacity
                      style={styles.itemCheckboxTouch}
                      onPress={() => toggleSelectItem(pl.id)}
                    >
                      <View
                        style={[
                          styles.itemCheckbox,
                          isSelected && styles.itemCheckboxActive,
                        ]}
                      >
                        {isSelected && (
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>

                    <Image
                      source={{ uri: pl.thumbnailUrl }}
                      style={styles.videoThumb}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{pl.title}</Text>
                      <Text style={styles.itemMeta}>
                        {pl.channelTitle} • {pl.videoCount} videos
                      </Text>
                      <Text style={styles.audienceMeta}>
                        For: {audienceLabel(pl.childIds)}
                      </Text>
                    </View>

                    {/* Single Delete Button */}
                    <TouchableOpacity
                      style={styles.itemDelete}
                      onPress={() => confirmDeleteSingle(pl, 'playlist')}
                      accessibilityLabel="Delete playlist"
                    >
                      <MaterialIcons name="delete" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* 4. BLOCKED CONTENT TAB */}
        {contentTab === 3 && (
          <View style={{ paddingBottom: 24 }}>
            {/* Segmented Toggle for Blocked Sub-Tab */}
            <View style={styles.blockedSegmentRow}>
              <TouchableOpacity
                style={[
                  styles.blockedSegmentBtn,
                  blockedSubTab === 'videos' && styles.blockedSegmentBtnActive,
                ]}
                onPress={() => setBlockedSubTab('videos')}
              >
                <MaterialIcons
                  name="movie"
                  size={16}
                  color={blockedSubTab === 'videos' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.blockedSegmentText,
                    blockedSubTab === 'videos' && styles.blockedSegmentTextActive,
                  ]}
                >
                  Blocked Videos ({blockedVideoIds.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.blockedSegmentBtn,
                  blockedSubTab === 'channels' && styles.blockedSegmentBtnActive,
                ]}
                onPress={() => setBlockedSubTab('channels')}
              >
                <MaterialIcons
                  name="subscriptions"
                  size={16}
                  color={blockedSubTab === 'channels' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.blockedSegmentText,
                    blockedSubTab === 'channels' && styles.blockedSegmentTextActive,
                  ]}
                >
                  Blocked Channels ({blockedChannelTitles.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Blocked Videos */}
            {blockedSubTab === 'videos' && (
              blockedVideoIds.length === 0 ? (
                <EmptyCard
                  icon="check-circle-outline"
                  title="No blocked videos"
                  subtitle="Videos blocked on child or player screen will appear here."
                />
              ) : (
                blockedVideosList.map((bVid) => (
                  <View key={bVid.id} style={styles.listItem}>
                    <Image source={{ uri: bVid.thumbnailUrl }} style={styles.videoThumb} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {bVid.title}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={1}>
                        {bVid.channelTitle}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.unblockBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
                      onPress={async () => {
                        await unblockVideo(bVid.id);
                        Alert.alert('Video Unblocked', `"${bVid.title}" has been restored.`);
                      }}
                    >
                      <MaterialIcons name="lock-open" size={16} color="#059669" />
                      <Text style={{ color: '#059669', fontWeight: '800', fontSize: 13, marginLeft: 4 }}>
                        Unblock
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            )}

            {/* Blocked Channels */}
            {blockedSubTab === 'channels' && (
              blockedChannelTitles.length === 0 ? (
                <EmptyCard
                  icon="check-circle-outline"
                  title="No blocked channels"
                  subtitle="Channels blocked by parent will appear here."
                />
              ) : (
                blockedChannelTitles.map((chTitle) => (
                  <View key={chTitle} style={styles.listItem}>
                    <View style={[styles.videoThumb, { backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }]}>
                      <MaterialIcons name="block" size={26} color="#DC2626" />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{chTitle}</Text>
                      <Text style={styles.itemMeta}>Blocked Channel</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.unblockBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}
                      onPress={async () => {
                        await unblockChannel(chTitle);
                        Alert.alert('Channel Unblocked', `Channel "${chTitle}" has been unblocked.`);
                      }}
                    >
                      <MaterialIcons name="lock-open" size={16} color="#059669" />
                      <Text style={{ color: '#059669', fontWeight: '800', fontSize: 13, marginLeft: 4 }}>
                        Unblock
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={previewVideo !== null}
        animationType="slide"
        onRequestClose={() => setPreviewVideo(null)}
      >
        <SafeAreaView style={styles.previewModal} edges={['top', 'left', 'right']}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleWrap}>
              <Text style={styles.previewHeading}>Video preview</Text>
              {previewVideo && (
                <Text style={styles.previewChannel} numberOfLines={1}>
                  {previewVideo.channelTitle}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.previewClose}
              onPress={() => setPreviewVideo(null)}
              accessibilityRole="button"
              accessibilityLabel="Close video preview"
            >
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {previewVideo && (
            <>
              <View style={styles.previewPlayer}>
                <WebView
                  source={{
                    html: buildYoutubePlayerHtml(previewVideo.youtubeId, {
                      controls: true,
                    }),
                  }}
                  style={styles.previewWebView}
                  originWhitelist={['*']}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsInlineMediaPlayback
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                />
              </View>
              <Text style={styles.previewVideoTitle}>{previewVideo.title}</Text>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Interactive Date Calendar / Month / Year Filter Modal */}
      <ContentFilterModal
        visible={filterModalType !== null}
        type={filterModalType}
        currentFilter={activeFilterSelection}
        onClose={() => setFilterModalType(null)}
        onApplyFilter={(f) => setActiveFilterSelection(f)}
      />

      {/* Child Filter Selection Modal */}
      <Modal
        visible={showChildFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChildFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowChildFilterModal(false)}
        >
          <View style={styles.childFilterSheet}>
            <View style={styles.childFilterHeader}>
              <Text style={styles.childFilterTitle}>Filter Content by Child</Text>
              <TouchableOpacity onPress={() => setShowChildFilterModal(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 36 }}
            >
              <TouchableOpacity
                style={[
                  styles.childFilterOption,
                  selectedChildFilter === null && styles.childFilterOptionActive,
                ]}
                onPress={() => {
                  setSelectedChildFilter(null);
                  setShowChildFilterModal(false);
                }}
              >
                <MaterialIcons
                  name="people"
                  size={20}
                  color={selectedChildFilter === null ? '#0284C7' : '#64748B'}
                />
                <Text
                  style={[
                    styles.childFilterOptionText,
                    selectedChildFilter === null && styles.childFilterOptionTextActive,
                  ]}
                >
                  All Children ({children.length})
                </Text>
              </TouchableOpacity>
              {children.map((child) => {
                const isSelected = selectedChildFilter === child.id;
                return (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.childFilterOption,
                      isSelected && styles.childFilterOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedChildFilter(child.id);
                      setShowChildFilterModal(false);
                    }}
                  >
                    <View
                      style={[
                        styles.childFilterAvatar,
                        { backgroundColor: hexLongToColor(child.colorHex) },
                      ]}
                    >
                      <Text style={{ fontSize: 14 }}>{child.avatarEmoji || '🌟'}</Text>
                    </View>
                    <Text
                      style={[
                        styles.childFilterOptionText,
                        isSelected && styles.childFilterOptionTextActive,
                      ]}
                    >
                      {child.displayName || child.username}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// --- Internal components ---
const EmptyCard: React.FC<{
  icon: MaterialIconsIconName;
  title: string;
  subtitle: string;
}> = ({ icon, title, subtitle }) => (
  <View style={styles.emptyCard}>
    <MaterialIcons name={icon} size={48} color="#94A3B8" />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  activeFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  activeFilterBold: {
    fontWeight: '900',
    color: '#0F172A',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    marginTop: 3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E52E2E',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: '#E52E2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 4,
  },
  stickyBarWrap: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    zIndex: 99,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  unifiedFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  filterDivider: {
    width: 2,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  batchActionBar: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  batchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchSelectedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginLeft: 8,
    flex: 1,
  },
  cancelSelectionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelSelectionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  deleteSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E52E2E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    elevation: 2,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  listItemSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  itemCheckboxTouch: {
    padding: 4,
    marginRight: 6,
  },
  itemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCheckboxActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  videoThumb: {
    width: 76,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  channelAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  channelAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  channelAvatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoPreviewThumb: {
    position: 'relative',
  },
  videoPreviewOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 10,
  },
  previewModal: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewTitleWrap: {
    flex: 1,
  },
  previewHeading: {
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: 'Fredoka',
    fontWeight: '600',
  },
  previewChannel: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 2,
  },
  previewClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewVideoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontFamily: 'Fredoka',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    marginTop: 3,
  },
  audienceMeta: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  itemDelete: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  childFilterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 24,
    maxHeight: '75%',
  },
  blockedSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginTop: 10,
    marginBottom: 16,
    gap: 6,
  },
  blockedSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  blockedSegmentBtnActive: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  blockedSegmentText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  blockedSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  childFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  childFilterTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  childFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  childFilterOptionActive: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  childFilterOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  childFilterOptionTextActive: {
    color: '#0369A1',
    fontWeight: '900',
  },
  childFilterAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 36,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyTitle: {
    fontWeight: '900',
    fontSize: 18,
    color: '#000000',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});