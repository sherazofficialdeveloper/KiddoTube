// src/components/ui/KidsVideoCard.tsx
import { ChildFontText as Text } from './ChildFontText';

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { formatVideoDuration } from '../../utils/formatTime';
import type { VideoItem } from '../../types/models';

/**
 * KidsVideoCard
 * 1:1 Pixel Clone of YouTube Kids Video Card (Screenshot 2).
 * 
 * - Rounded 16:9 thumbnail with dark duration badge at bottom right
 * - Bold title (2 lines max)
 * - Channel subtitle
 * - 3-dots options menu on right
 */

interface KidsVideoCardProps {
  video: VideoItem;
  onClick: () => void;
  isDownloading?: boolean;
  downloadProgress?: number;
  isDownloaded?: boolean;
  onDeleteDownload?: () => void;
  onMoreClick?: (video: VideoItem) => void;
}

export const KidsVideoCard: React.FC<KidsVideoCardProps> = ({
  video,
  onClick,
  isDownloading = false,
  downloadProgress = 0,
  isDownloaded = false,
  onDeleteDownload,
  onMoreClick,
}) => {
  const duration = formatVideoDuration(video.durationText);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onClick}
      testID={`video_card_${video.id}`}
    >
      {/* 16:9 Video Thumbnail */}
      <View style={styles.thumbnailWrap}>
        <Image
          source={{ uri: video.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        {/* Duration badge (bottom-right) */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{duration}</Text>
        </View>

        {/* Favorite heart badge (top-left) */}
        {video.isFavorite && (
          <View style={styles.favoriteBadge}>
            <MaterialIcons name="favorite" size={14} color="#EF4444" />
          </View>
        )}

        {/* Downloaded Badge (top-right) */}
        {isDownloaded && !isDownloading && (
          <View style={styles.downloadedBadge}>
            <MaterialIcons name="check-circle" size={12} color="#10B981" />
            <Text style={styles.downloadedBadgeText}>Saved</Text>
          </View>
        )}

        {/* Downloading Progress Overlay */}
        {isDownloading && (
          <View style={styles.downloadingOverlay}>
            <View style={styles.downloadingBadge}>
              <MaterialIcons name="cloud-download" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.downloadingText}>Downloading {downloadProgress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, downloadProgress))}%` }]} />
            </View>
          </View>
        )}
      </View>

      {/* Info Row: Title & Subtitle + Action buttons */}
      <View style={styles.infoRow}>
        <View style={styles.textColumn}>
          <Text
            style={styles.title}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {video.title}
          </Text>

          <Text
            style={styles.channelName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {video.channelTitle}
          </Text>
        </View>

        {/* Delete Download Button (if provided) */}
        {onDeleteDownload && (
          <TouchableOpacity
            style={styles.deleteDownloadBtn}
            activeOpacity={0.7}
            onPress={onDeleteDownload}
            accessibilityLabel="Delete downloaded video"
          >
            <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}

        {/* Three-dots menu */}
        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.6}
          onPress={onMoreClick ? () => onMoreClick(video) : onClick}
        >
          <MaterialIcons
            name="more-vert"
            size={22}
            color="#606060"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 8,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 18,
  },
  thumbnailWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    paddingRight: 6,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: '#000000',
  },
  channelName: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '700',
    marginTop: 4,
  },
  menuButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  downloadedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  downloadedBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  downloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  downloadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  downloadingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  deleteDownloadBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});