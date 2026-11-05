// src/constants/tabs.ts

import type { ComponentProps } from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { VideoCategory, getVideoCategoryDisplayName } from '../types/models';

/**
 * Category Tab Metadata
 * Migrated 1:1 from Kotlin KidsCategoryRow.kt
 * 
 * Kotlin: Icons.Default.AutoAwesome → MaterialIcons 'auto-awesome'
 * Kotlin: Icons.Default.Movie       → MaterialIcons 'movie'
 * Kotlin: Icons.Default.MusicNote   → MaterialIcons 'music-note'
 * Kotlin: Icons.Default.Lightbulb   → MaterialIcons 'lightbulb'
 * Kotlin: Icons.Default.Explore     → MaterialIcons 'explore'
 */

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export interface CategoryTabMeta {
  category: VideoCategory;
  icon: MaterialIconName;
  label: string;
}

export const CATEGORY_TABS: CategoryTabMeta[] = [
  {
    category: VideoCategory.ALL,
    icon: 'auto-awesome',
    label: getVideoCategoryDisplayName(VideoCategory.ALL),
  },
  {
    category: VideoCategory.DOWNLOADS,
    icon: 'file-download',
    label: getVideoCategoryDisplayName(VideoCategory.DOWNLOADS),
  },
  {
    category: VideoCategory.SHOWS,
    icon: 'movie',
    label: getVideoCategoryDisplayName(VideoCategory.SHOWS),
  },
  {
    category: VideoCategory.MUSIC,
    icon: 'music-note',
    label: getVideoCategoryDisplayName(VideoCategory.MUSIC),
  },
  {
    category: VideoCategory.LEARNING,
    icon: 'lightbulb',
    label: getVideoCategoryDisplayName(VideoCategory.LEARNING),
  },
  {
    category: VideoCategory.EXPLORE,
    icon: 'explore',
    label: getVideoCategoryDisplayName(VideoCategory.EXPLORE),
  },
  {
    category: VideoCategory.PLAYLISTS,
    icon: 'playlist-play',
    label: getVideoCategoryDisplayName(VideoCategory.PLAYLISTS),
  },
];