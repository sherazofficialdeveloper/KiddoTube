// src/features/channel/ChannelDetailsScreen.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';

import { KidsVideoCard } from '../../components/ui/KidsVideoCard';
import { KidsEmptyState } from '../../components/ui/KidsStatusViews';

import { useContentStore } from '../../store/contentStore';
import { hexLongToColor } from '../../utils/color';
import { ScreenState } from '../../types/navigation';
import { navigate } from '../../app/navigation/navigationRef';
import type { RootStackParamList } from '../../types/navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * ChannelDetailsScreen
 * Migrated 1:1 from Kotlin ChannelDetailsScreen.kt
 * 
 * - Back button + channel title in top bar
 * - Hero card: circular avatar + name + "Parent Approved" + description
 * - Videos feed for this channel
 */

type ChannelDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenState.CHANNEL_DETAILS
>;

export const ChannelDetailsScreen: React.FC<ChannelDetailsScreenProps> = ({
  route,
}) => {
  const { channelId, previousScreen } = route.params;

  const channel = useContentStore((s) =>
    s.approvedChannels.find((c) => c.id === channelId)
  );
  const videos = useContentStore((s) => s.approvedVideos);

  const channelVideos = useMemo(() => {
    if (!channel) return [];
    return videos.filter(
      (v) =>
        !v.isBlocked &&
        v.channelTitle.toLowerCase() === channel.title.toLowerCase()
    );
  }, [channel, videos]);

  const handleBack = () => {
    if (previousScreen === ScreenState.SEARCH) {
      navigate(ScreenState.SEARCH, { previousScreen: ScreenState.HOME });
    } else {
      navigate(previousScreen);
    }
  };

  if (!channel) {
    return (
      <View style={styles.root}>
        <SafeAreaView>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialIcons
                name="arrow-back"
                size={26}
                color={Colors.kidsTextPrimary}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <KidsEmptyState
          title="Channel Not Found"
          subtitle="This channel is no longer available."
        />
      </View>
    );
  }

  const accentColor = hexLongToColor(channel.colorAccentHex);

  return (
    <View style={styles.root} testID="channel_details_screen">
      {/* Top bar */}
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="channel_back_button"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color={Colors.kidsTextPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {channel.title}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.92}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View
            style={[
              styles.avatarRing,
              { borderColor: accentColor },
            ]}
          >
            {channel.avatarUrl ? (
              <Image
                source={{ uri: channel.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: accentColor }]}>
                {channel.title.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          <Text style={styles.channelTitle}>{channel.title}</Text>

          <View style={styles.approvedRow}>
            <MaterialIcons
              name="check-circle"
              size={16}
              color={Colors.kidsSkyBlue}
            />
            <Text style={styles.approvedText}>
              Parent Approved Channel • {channelVideos.length} videos
            </Text>
          </View>

          {channel.description ? (
            <Text style={styles.description}>{channel.description}</Text>
          ) : null}
        </View>

        {/* Videos header */}
        <Text style={styles.sectionTitle}>
          Approved Videos from {channel.title}
        </Text>

        {/* Videos */}
        {channelVideos.length > 0 ? (
          <View>
            {channelVideos.map((video) => (
              <KidsVideoCard
                key={video.id}
                video={video}
                onClick={() =>
                  navigate(ScreenState.PLAYER, {
                    videoId: video.id,
                    previousScreen: ScreenState.CHANNEL_DETAILS,
                  })
                }
              />
            ))}
          </View>
        ) : (
          <KidsEmptyState
            title="No Videos Approved Yet"
            subtitle="There are no approved videos for this channel right now."
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.kidsBackground,
  },
  safeTop: {
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    height: Dimensions.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backButton: {
    width: Dimensions.touchTargetMin,
    height: Dimensions.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    ...Typography.titleLarge,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.kidsTextPrimary,
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '900',
  },
  channelTitle: {
    ...Typography.headlineLarge,
    fontSize: 22,
    fontWeight: '900',
    color: Colors.kidsTextPrimary,
    marginTop: 12,
  },
  approvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  approvedText: {
    ...Typography.labelMedium,
    color: Colors.kidsSkyBlue,
    fontWeight: '700',
    marginLeft: 4,
  },
  description: {
    ...Typography.bodyMedium,
    color: Colors.kidsTextSecondary,
    marginTop: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: Colors.kidsTextPrimary,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
});