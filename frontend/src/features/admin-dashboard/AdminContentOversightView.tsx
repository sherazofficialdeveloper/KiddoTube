// src/features/admin-dashboard/AdminContentOversightView.tsx
import { FontText as Text, FontTextInput as TextInput } from '../../components/ui/FontText';

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type {
  AdminChildItemDto,
  AdminParentItemDto,
  ChannelItemDto,
  PlaylistItemDto,
  VideoItemDto,
} from '../../types/api';
import {
  ContentFilterModal,
  FilterModalType,
  FilterSelection,
} from '../../components/ui/ContentFilterModal';
import { matchesContentDateFilter } from '../../utils/contentDate';

interface AdminContentOversightViewProps {
  videos: VideoItemDto[];
  channels: ChannelItemDto[];
  playlists: PlaylistItemDto[];
  children: AdminChildItemDto[];
  parents?: AdminParentItemDto[];
  initialContentType?: 'video' | 'channel' | 'playlist';
  onModerate: (
    type: 'video' | 'channel' | 'playlist',
    id: string,
    action: 'REMOVE'
  ) => Promise<{ success: boolean; error?: string }>;
}

type SortCriteria = 'date_desc' | 'date_asc' | 'month' | 'year' | 'user';

const isParentIdentifier = (value: string): boolean =>
  /^parent_/i.test(value) ||
  /^[a-f0-9]{24}$/i.test(value) ||
  /^67[a-f0-9]{22}$/i.test(value);

export const AdminContentOversightView: React.FC<AdminContentOversightViewProps> = ({
  videos,
  channels,
  playlists,
  children,
  parents,
  initialContentType,
  onModerate,
}) => {
  const [contentType, setContentType] = useState<'video' | 'channel' | 'playlist'>(
    initialContentType || 'video'
  );

  React.useEffect(() => {
    if (initialContentType) {
      setContentType(initialContentType);
    }
  }, [initialContentType]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSort] = useState<SortCriteria>('date_desc');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterModalType, setFilterModalType] = useState<FilterModalType>(null);
  const [activeFilterSelection, setActiveFilterSelection] = useState<FilterSelection | null>(null);
  const [removingVideoId, setRemovingVideoId] = useState<string | null>(null);
  const childNameById = useMemo(
    () => new Map(children.map((child) => [child.id, child.displayName || child.username])),
    [children]
  );

  const parentNameById = useMemo(() => {
    const map = new Map<string, string>();
    (parents || []).forEach((p) => {
      const candidates = [
        p.displayName,
        p.username,
        p.email ? p.email.split('@')[0] : null,
      ];
      const name =
        candidates.find(
          (value): value is string =>
            typeof value === 'string' &&
            Boolean(value.trim()) &&
            !isParentIdentifier(value.trim())
        ) || 'Parent';
      if (p.id) map.set(String(p.id), name);
      if ((p as any)._id) map.set(String((p as any)._id), name);
    });
    map.set('admin_1', 'System Administrator');
    map.set('admin', 'KiddoTube Admin');
    map.set('system', 'System Administrator');
    return map;
  }, [parents]);

  const resolveParentName = useCallback(
    (parentId?: string | null, parentName?: string | null): string => {
      if (
        parentName &&
        parentName !== 'Unknown Parent' &&
        !isParentIdentifier(parentName)
      ) {
        return parentName;
      }
      if (parentId && parentNameById.has(String(parentId))) {
        return parentNameById.get(String(parentId))!;
      }
      if (parentName && parentName !== 'Unknown Parent') {
        return parentName;
      }
      if (parentId === 'admin_1' || parentId === 'admin' || parentId === 'system') {
        return 'System Administrator';
      }
      return 'KiddoTube Parent';
    },
    [parentNameById]
  );

  // Filter & Sort
  const processedVideos = useMemo(() => {
    let result = [...videos];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          (v.channelTitle && v.channelTitle.toLowerCase().includes(q)) ||
          (v.sourceName && v.sourceName.toLowerCase().includes(q)) ||
          (v.parentName && v.parentName.toLowerCase().includes(q)) ||
          (v.parentId && v.parentId.toLowerCase().includes(q)) ||
          resolveParentName(v.parentId, v.parentName).toLowerCase().includes(q) ||
          (v.allowedChildNames && v.allowedChildNames.some((c) => c.toLowerCase().includes(q)))
      );
    }

    // Category filter
    if (filterCategory !== 'ALL') {
      result = result.filter(
        (v) => (v.category || '').toUpperCase() === filterCategory.toUpperCase()
      );
    }

    // Interactive Modal Filter (Date, Month, Year, User)
    if (activeFilterSelection) {
      if (activeFilterSelection.type === 'date' ||
          activeFilterSelection.type === 'month' ||
          activeFilterSelection.type === 'year') {
        result = result.filter((video) =>
          matchesContentDateFilter(video.createdAt, activeFilterSelection)
        );
      } else if (activeFilterSelection.type === 'user') {
        const targetUser = activeFilterSelection.value.toLowerCase();
        result = result.filter((v) => {
          const resolvedName = resolveParentName(v.parentId, v.parentName).toLowerCase();
          const pId = (v.parentId || '').toLowerCase();
          return resolvedName.includes(targetUser) || pId === targetUser;
        });
      }
    }

    // Sorting
    result.sort((a, b) => {
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
        case 'user': {
          const userA = (a.parentId || a.channelTitle || '').toLowerCase();
          const userB = (b.parentId || b.channelTitle || '').toLowerCase();
          return userA.localeCompare(userB);
        }
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [
    videos,
    searchQuery,
    activeSort,
    filterCategory,
    activeFilterSelection,
    resolveParentName,
  ]);

  const matchesOtherContent = useCallback((item: ChannelItemDto | PlaylistItemDto) => {
    const query = searchQuery.trim().toLowerCase();
    if (
      query &&
      !item.title.toLowerCase().includes(query) &&
      !(item.parentId || '').toLowerCase().includes(query) &&
      !resolveParentName(item.parentId, item.parentName)
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }
    if (
      activeFilterSelection?.type === 'date' ||
      activeFilterSelection?.type === 'month' ||
      activeFilterSelection?.type === 'year'
    ) {
      return matchesContentDateFilter(item.createdAt, activeFilterSelection);
    }
    if (activeFilterSelection?.type === 'user') {
      const targetUser = activeFilterSelection.value.toLowerCase();
      const resolvedName = resolveParentName(item.parentId, item.parentName).toLowerCase();
      const pId = (item.parentId || '').toLowerCase();
      return resolvedName.includes(targetUser) || pId === targetUser;
    }
    return true;
  }, [activeFilterSelection, searchQuery, resolveParentName]);
  const processedChannels = useMemo(
    () => channels.filter(matchesOtherContent),
    [channels, matchesOtherContent]
  );
  const processedPlaylists = useMemo(
    () => playlists.filter(matchesOtherContent),
    [playlists, matchesOtherContent]
  );
  const audienceLabel = (childIds?: string[]) => {
    if (!childIds?.length) return 'All children';
    const names = childIds
      .map((id) => childNameById.get(String(id)))
      .filter((name): name is string => Boolean(name));
    return names.length ? names.join(', ') : childIds.join(', ');
  };

  // Derive unique parents list for the parent filter modal
  const usersList = useMemo(() => {
    const map = new Map<string, { id: string; username: string; displayName: string }>();

    if (parents && parents.length) {
      parents.forEach((p) => {
        const candidates = [
          p.displayName,
          p.username,
          p.email ? p.email.split('@')[0] : null,
        ];
        const name =
          candidates.find(
            (value): value is string =>
              typeof value === 'string' &&
              Boolean(value.trim()) &&
              !isParentIdentifier(value.trim())
          ) || 'Parent';
        map.set(String(p.id), {
          id: String(p.id),
          username: p.username || name,
          displayName: name,
        });
      });
    }

    videos.forEach((v) => {
      if (v.parentId && !map.has(String(v.parentId))) {
        const name = resolveParentName(v.parentId, v.parentName);
        map.set(String(v.parentId), {
          id: String(v.parentId),
          username: name,
          displayName: name,
        });
      }
    });
    channels.forEach((item) => {
      if (item.parentId && !map.has(String(item.parentId))) {
        const name = resolveParentName(item.parentId, item.parentName);
        map.set(String(item.parentId), {
          id: String(item.parentId),
          username: name,
          displayName: name,
        });
      }
    });
    playlists.forEach((item) => {
      if (item.parentId && !map.has(String(item.parentId))) {
        const name = resolveParentName(item.parentId, item.parentName);
        map.set(String(item.parentId), {
          id: String(item.parentId),
          username: name,
          displayName: name,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  }, [parents, videos, channels, playlists, resolveParentName]);

  const confirmRemove = (vid: VideoItemDto) => {
    Alert.alert(
      'Remove Video',
      `Are you sure you want to remove "${vid.title}" from platform whitelist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingVideoId(vid.id);
            try {
              const result = await onModerate('video', vid.id, 'REMOVE');
              if (!result.success) {
                Alert.alert(
                  'Unable to remove video',
                  result.error || 'The video could not be removed.'
                );
              }
            } catch (error) {
              Alert.alert(
                'Unable to remove video',
                error instanceof Error ? error.message : 'The video could not be removed.'
              );
            } finally {
              setRemovingVideoId(null);
            }
          },
        },
      ]
    );
  };

  const confirmRemoveOther = (
    type: 'channel' | 'playlist',
    id: string,
    title: string
  ) => {
    const label = type === 'channel' ? 'channel' : 'playlist';
    Alert.alert(`Remove ${label}`, `Remove "${title}" from the platform?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemovingVideoId(id);
          try {
            const result = await onModerate(type, id, 'REMOVE');
            if (!result.success) {
              Alert.alert(`Unable to remove ${label}`, result.error || 'Please try again.');
            }
          } catch (error) {
            Alert.alert(
              `Unable to remove ${label}`,
              error instanceof Error ? error.message : 'Please try again.'
            );
          } finally {
            setRemovingVideoId(null);
          }
        },
      },
    ]);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <View style={styles.root}>
      {/* Scrollable container with sticky single-line filter bar */}
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.92}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      >
        {/* Index 0: Header title, description & search bar that scroll away */}
        <View style={styles.headerBlock}>
          <View style={styles.header}>
            <Text style={styles.title}>
              All {contentType === 'video' ? 'Videos' : contentType === 'channel' ? 'Channels' : 'Playlists'} Oversight
              ({contentType === 'video' ? videos.length : contentType === 'channel' ? channels.length : playlists.length})
            </Text>
            <Text style={styles.subtitle}>
              System-wide inspection of content approved by parents
            </Text>
          </View>

          {/* Search Input */}
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={22} color="#0284C7" />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${contentType}s by title or parent...`}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="clear" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
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
            {([
              ['video', `Videos (${videos.length})`],
              ['channel', `Channels (${channels.length})`],
              ['playlist', `Playlists (${playlists.length})`],
            ] as const).map(([type, label]) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterPill, contentType === type && styles.filterPillActive]}
                onPress={() => setContentType(type)}
                accessibilityRole="button"
                accessibilityState={{ selected: contentType === type }}
              >
                <MaterialIcons
                  name={type === 'video' ? 'movie' : type === 'channel' ? 'subscriptions' : 'playlist-play'}
                  size={16}
                  color={contentType === type ? '#FFFFFF' : '#000000'}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    contentType === type && styles.filterPillTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            {/* Video category chips if on videos */}
            {contentType === 'video' && (
              <>
                {['ALL', 'LEARNING', 'MUSIC', 'SHOWS', 'EXPLORE'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterPill,
                      filterCategory === category && styles.filterPillActive,
                    ]}
                    onPress={() => setFilterCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        filterCategory === category && styles.filterPillTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.filterDivider} />
              </>
            )}

            {/* Date Calendar */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilterSelection?.type === 'date' && styles.filterPillActive,
              ]}
              onPress={() => setFilterModalType('date')}
            >
              <MaterialIcons
                name="calendar-today"
                size={14}
                color={activeFilterSelection?.type === 'date' ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilterSelection?.type === 'date' && styles.filterPillTextActive,
                ]}
              >
                Date Calendar
              </Text>
            </TouchableOpacity>

            {/* Month */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilterSelection?.type === 'month' && styles.filterPillActive,
              ]}
              onPress={() => setFilterModalType('month')}
            >
              <MaterialIcons
                name="date-range"
                size={14}
                color={activeFilterSelection?.type === 'month' ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilterSelection?.type === 'month' && styles.filterPillTextActive,
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>

            {/* Year */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilterSelection?.type === 'year' && styles.filterPillActive,
              ]}
              onPress={() => setFilterModalType('year')}
            >
              <MaterialIcons
                name="event"
                size={14}
                color={activeFilterSelection?.type === 'year' ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilterSelection?.type === 'year' && styles.filterPillTextActive,
                ]}
              >
                Year
              </Text>
            </TouchableOpacity>

            {/* Parent Filter */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilterSelection?.type === 'user' && styles.filterPillActive,
              ]}
              onPress={() => setFilterModalType('user')}
            >
              <MaterialIcons
                name="person"
                size={14}
                color={activeFilterSelection?.type === 'user' ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  activeFilterSelection?.type === 'user' && styles.filterPillTextActive,
                ]}
              >
                {activeFilterSelection?.type === 'user'
                  ? `Parent: ${activeFilterSelection.displayLabel}`
                  : 'Parent'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Active Filter Banner */}
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

        {contentType === 'video' && (processedVideos.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="videocam-off" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching videos found</Text>
            <Text style={styles.emptySub}>Try adjusting search query or sort filter.</Text>
          </View>
        ) : (
          processedVideos.map((vid) => (
            <View key={vid.id} style={styles.card}>
              <View style={styles.cardMain}>
                {/* Thumbnail */}
                <View style={styles.thumbWrap}>
                  <Image
                    source={{
                      uri:
                        vid.thumbnailUrl ||
                        `https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`,
                    }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {vid.durationText || '05:00'}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {vid.title}
                  </Text>
                  {vid.sourceType === 'PLAYLIST' || (vid.sourceName && vid.sourceName.startsWith('Playlist:')) ? (
                    <Text style={styles.channelText} numberOfLines={1}>
                      📂 {vid.sourceName}
                    </Text>
                  ) : vid.sourceType === 'CHANNEL' ? (
                    <Text style={styles.channelText} numberOfLines={1}>
                      📺 {vid.channelTitle}
                    </Text>
                  ) : (
                    <Text style={[styles.channelText, { color: '#0284C7' }]} numberOfLines={1}>
                      🎬 Direct Video
                    </Text>
                  )}
                  <View style={styles.metaRow}>
                    <Text style={styles.cardMeta}>
                      📅 {formatDate(vid.publishedAt || vid.createdAt)} • Parent:{' '}
                      <Text style={styles.metaHighlight}>
                        {resolveParentName(vid.parentId, vid.parentName)}
                      </Text>
                    </Text>
                    <Text style={styles.cardMeta}>
                      For: {vid.allowedChildNames && vid.allowedChildNames.length > 0
                        ? vid.allowedChildNames.join(', ')
                        : audienceLabel(vid.childIds)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Actions */}
              <View style={styles.cardBottomRow}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>
                    {vid.category || 'ALL'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => confirmRemove(vid)}
                  disabled={removingVideoId === vid.id}
                >
                  <MaterialIcons
                    name={removingVideoId === vid.id ? 'hourglass-empty' : 'delete-outline'}
                    size={16}
                    color="#DC2626"
                  />
                  <Text style={styles.removeText}>
                    {removingVideoId === vid.id ? 'Removing...' : 'Remove'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ))}
        {contentType === 'channel' && (processedChannels.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="subscriptions" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching channels found</Text>
          </View>
        ) : processedChannels.map((channel) => (
          <View key={channel.id} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.channelAvatarCircle}>
                {channel.avatarUrl ? (
                  <Image source={{ uri: channel.avatarUrl }} style={styles.channelAvatarImg} />
                ) : (
                  <Text style={styles.channelAvatarText}>
                    {(channel.title || 'C')[0].toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{channel.title}</Text>
                <Text style={styles.cardMeta}>
                  📅 {formatDate(channel.createdAt)} • Parent: <Text style={styles.metaHighlight}>{resolveParentName(channel.parentId, channel.parentName)}</Text>
                </Text>
                <Text style={styles.cardMeta}>
                  For: {channel.allowedChildNames && channel.allowedChildNames.length > 0
                    ? channel.allowedChildNames.join(', ')
                    : audienceLabel(channel.childIds)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => confirmRemoveOther('channel', channel.id, channel.title)}
                disabled={removingVideoId === channel.id}
              >
                <MaterialIcons name="delete" size={16} color="#DC2626" />
                <Text style={styles.removeText}>
                  {removingVideoId === channel.id ? 'Removing...' : 'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )))}
        {contentType === 'playlist' && (processedPlaylists.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="playlist-play" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching playlists found</Text>
          </View>
        ) : processedPlaylists.map((playlist) => (
          <View key={playlist.id} style={styles.card}>
            <Text style={styles.cardTitle}>{playlist.title}</Text>
            <Text style={styles.cardMeta}>
              Parent: {resolveParentName(playlist.parentId, playlist.parentName)} • {formatDate(playlist.createdAt)}
            </Text>
            <Text style={styles.cardMeta}>
              For: {playlist.allowedChildNames && playlist.allowedChildNames.length > 0
                ? playlist.allowedChildNames.join(', ')
                : audienceLabel(playlist.childIds)}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => confirmRemoveOther('playlist', playlist.id, playlist.title)}
              disabled={removingVideoId === playlist.id}
            >
              <Text style={styles.removeText}>
                {removingVideoId === playlist.id ? 'Removing...' : 'Remove'}
              </Text>
            </TouchableOpacity>
          </View>
        )))}
      </ScrollView>

      {/* Interactive Date Calendar / Month / Year / Parent Filter Modal */}
      <ContentFilterModal
        visible={filterModalType !== null}
        type={filterModalType}
        currentFilter={activeFilterSelection}
        usersList={usersList}
        userLabel="Parent"
        onClose={() => setFilterModalType(null)}
        onApplyFilter={(f) => setActiveFilterSelection(f)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  headerBlock: {
    marginBottom: 6,
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
    marginBottom: 10,
  },
  contentTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  contentTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contentTabActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  contentTabText: { color: '#475569', fontWeight: '900', fontSize: 13 },
  contentTabTextActive: { color: '#FFFFFF' },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryRow: { marginBottom: 10, maxHeight: 38 },
  sortLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginRight: 8,
  },
  sortChipsRow: {
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardMain: {
    flexDirection: 'row',
  },
  thumbWrap: {
    width: 110,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginRight: 12,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 18,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    marginTop: 3,
  },
  metaRow: {
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metaHighlight: {
    fontWeight: '700',
    color: '#1E293B',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  removeText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
  },
  channelAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  channelAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  channelAvatarText: {
    color: '#0284C7',
    fontWeight: '900',
    fontSize: 18,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});