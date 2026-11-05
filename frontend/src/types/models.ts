// src/types/models.ts

/**
 * KidsStream Content Models
 * Migrated 1:1 from Kotlin KidsContentModels.kt
 */

export enum VideoCategory {
  ALL = 'ALL',
  DOWNLOADS = 'DOWNLOADS',
  SHOWS = 'SHOWS',
  MUSIC = 'MUSIC',
  LEARNING = 'LEARNING',
  EXPLORE = 'EXPLORE',
  PLAYLISTS = 'PLAYLISTS',
}

/**
 * Helper: Get display name for VideoCategory
 * Maps to Kotlin: VideoCategory.displayName
 */
export const getVideoCategoryDisplayName = (category: VideoCategory): string => {
  const map: Record<VideoCategory, string> = {
    [VideoCategory.ALL]: 'All',
    [VideoCategory.DOWNLOADS]: 'Downloads',
    [VideoCategory.SHOWS]: 'Shows',
    [VideoCategory.MUSIC]: 'Music',
    [VideoCategory.LEARNING]: 'Learning',
    [VideoCategory.EXPLORE]: 'Explore',
    [VideoCategory.PLAYLISTS]: 'Playlists',
  };
  return map[category];
};

export interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle: string;
  channelAvatarUrl?: string;
  thumbnailUrl: string;
  durationText: string;
  category: VideoCategory;
  description?: string;
  viewCountText?: string;
  createdAt?: string;
  childIds?: string[];
  isBlocked?: boolean;
  isFavorite?: boolean;
  likesCount?: number;
  localUri?: string;
  videoUrl?: string;
}

export interface ChannelItem {
  id: string;
  title: string;
  avatarUrl: string;
  videoCount: number;
  colorAccentHex: number;
  description?: string;
  childIds?: string[];
  isBlocked?: boolean;
}

export interface PlaylistItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoCount: number;
  videoIds?: string[];
  childIds?: string[];
  isBlocked?: boolean;
}

export interface ChildProfile {
  id: string;
  name: string;
  username?: string;
  avatarEmoji: string;
  colorHex: number;
  ageGroup?: number;
  dailyLimitMinutes: number;
  minutesWatchedToday: number;
  parentId?: string;
}

export interface ChildSession {
  isAuthenticated: boolean;
  username: string;
  profile: ChildProfile | null;
}

/**
 * SearchResultBundle
 * Maps to Kotlin SearchResultBundle data class
 */
export interface SearchResultBundle {
  videos: VideoItem[];
  channels: ChannelItem[];
  playlists: PlaylistItem[];
}

export const isEmptySearchResult = (bundle: SearchResultBundle): boolean => {
  return (
    bundle.videos.length === 0 &&
    bundle.channels.length === 0 &&
    bundle.playlists.length === 0
  );
};