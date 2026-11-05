// src/components/ui/KidsPlaylistCard.tsx
import { ChildFontText as Text } from './ChildFontText';

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';
import type { PlaylistItem } from '../../types/models';

/**
 * KidsPlaylistCard
 * Migrated 1:1 from Kotlin KidsPlaylistCard.kt
 * 
 * 220dp wide card: 16:9.5 thumbnail + playlist count badge + title + channel
 */

interface KidsPlaylistCardProps {
  playlist: PlaylistItem;
  onClick: () => void;
  fullWidth?: boolean;
}

export const KidsPlaylistCard: React.FC<KidsPlaylistCardProps> = ({
  playlist,
  onClick,
  fullWidth = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, fullWidth && styles.fullWidthCard]}
      activeOpacity={0.9}
      onPress={onClick}
      testID={`playlist_card_${playlist.id}`}
    >
      {/* Thumbnail with playlist badge */}
      <View style={styles.thumbnailWrap}>
        <Image
          source={{ uri: playlist.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        {/* Playlist count overlay badge (bottom-right) */}
        <View style={styles.countBadge}>
          <MaterialIcons name="playlist-play" size={14} color="#FFFFFF" />
          <Text style={styles.countText}>{playlist.videoCount} videos</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[Typography.titleMedium, styles.title]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {playlist.title}
        </Text>

        <Text
          style={[Typography.bodyMedium, styles.channel]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {playlist.channelTitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: Colors.kidsSurface,
    borderRadius: Dimensions.radiusMedium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidthCard: {
    width: '100%',
  },
  thumbnailWrap: {
    width: '100%',
    aspectRatio: 16 / 9.5,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  countBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.kidsTextPrimary,
  },
  channel: {
    fontSize: 12,
    color: Colors.kidsTextSecondary,
    marginTop: 2,
  },
});