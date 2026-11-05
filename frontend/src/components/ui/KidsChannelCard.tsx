// src/components/ui/KidsChannelCard.tsx
import { ChildFontText as Text } from './ChildFontText';

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';
import { hexLongToColor, getInitial } from '../../utils/color';
import type { ChannelItem } from '../../types/models';

/**
 * KidsChannelCard
 * Migrated 1:1 from Kotlin KidsChannelCard.kt
 * 
 * 88dp wide card: circular avatar + colored ring + title + video count
 */

interface KidsChannelCardProps {
  channel: ChannelItem;
  onClick: () => void;
}

export const KidsChannelCard: React.FC<KidsChannelCardProps> = ({
  channel,
  onClick,
}) => {
  const accentColor = hexLongToColor(channel.colorAccentHex);
  const initial = getInitial(channel.title);
  const avatarSize = Dimensions.channelAvatarSize; // 72

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={onClick}
      testID={`channel_card_${channel.id}`}
    >
      {/* Avatar with colored ring */}
      <View
        style={[
          styles.avatarRing,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderColor: accentColor,
            backgroundColor: accentColor + '26', // 15% alpha
          },
        ]}
      >
        {channel.avatarUrl ? (
          <Image
            source={{ uri: channel.avatarUrl }}
            style={[
              styles.avatarImage,
              {
                width: avatarSize - 6,
                height: avatarSize - 6,
                borderRadius: (avatarSize - 6) / 2,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={[
              Typography.titleLarge,
              { color: accentColor, fontWeight: '900', fontSize: 22 },
            ]}
          >
            {initial}
          </Text>
        )}
      </View>

      <Text
        style={[Typography.labelMedium, styles.title]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {channel.title}
      </Text>

      <Text style={[Typography.labelSmall, styles.count]}>
        {channel.videoCount} videos
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 88,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarImage: {
    // dynamic sizing in component
  },
  title: {
    fontSize: 12,
    color: Colors.kidsTextPrimary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  count: {
    fontSize: 10,
    color: Colors.kidsTextMuted,
    textAlign: 'center',
  },
});