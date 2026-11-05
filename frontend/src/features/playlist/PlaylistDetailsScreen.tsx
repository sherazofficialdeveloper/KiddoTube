// src/features/playlist/PlaylistDetailsScreen.tsx
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

import { KidsEmptyState } from '../../components/ui/KidsStatusViews';

import { useContentStore } from '../../store/contentStore';
import { ScreenState } from '../../types/navigation';
import { navigate } from '../../app/navigation/navigationRef';
import type { RootStackParamList } from '../../types/navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * PlaylistDetailsScreen
 * Migrated 1:1 from Kotlin PlaylistDetailsScreen.kt
 * 
 * - Hero card with thumbnail + "Play All" button
 * - Numbered list of videos
 */

type PlaylistDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenState.PLAYLIST_DETAILS
>;

export const PlaylistDetailsScreen: React.FC<PlaylistDetailsScreenProps> = ({
  route,
}) => {
  const { playlistId, previousScreen } = route.params;

  const playlist = useContentStore((s) =>
    s.approvedPlaylists.find((p) => p.id === playlistId)
  );
  const videos = useContentStore((s) => s.approvedVideos);

  const playlistVideos = useMemo(() => {
    if (!playlist) return [];
    const active = videos.filter((v) => !v.isBlocked);
    const matching = active.filter((v) =>
      playlist.videoIds?.includes(v.id)
    );
    if (matching.length > 0) return matching;
    return active.slice(0, playlist.videoCount);
  }, [playlist, videos]);

  const handleBack = () => {
    if (previousScreen === ScreenState.SEARCH) {
      navigate(ScreenState.SEARCH, { previousScreen: ScreenState.HOME });
    } else {
      navigate(previousScreen);
    }
  };

  if (!playlist) {
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
          title="Playlist Not Found"
          subtitle="This playlist is no longer available."
        />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="playlist_details_screen">
      {/* Top bar */}
      <SafeAreaView style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="playlist_back_button"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color={Colors.kidsTextPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {playlist.title}
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
          <View style={styles.thumbnailWrap}>
            <Image
              source={{ uri: playlist.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />

            {playlistVideos.length > 0 && (
              <TouchableOpacity
                style={styles.playAllButton}
                activeOpacity={0.9}
                onPress={() =>
                  navigate(ScreenState.PLAYER, {
                    videoId: playlistVideos[0].id,
                    previousScreen: ScreenState.PLAYLIST_DETAILS,
                  })
                }
              >
                <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.playlistTitle}>{playlist.title}</Text>

          <Text style={styles.playlistMeta}>
            {playlist.channelTitle} • {playlistVideos.length} approved videos
          </Text>
        </View>

        {/* Videos header */}
        <Text style={styles.sectionTitle}>Playlist Videos</Text>

        {/* Videos numbered list */}
        {playlistVideos.length > 0 ? (
          <View>
            {playlistVideos.map((video, index) => (
              <TouchableOpacity
                key={video.id}
                style={styles.videoRow}
                activeOpacity={0.85}
                onPress={() =>
                  navigate(ScreenState.PLAYER, {
                    videoId: video.id,
                    previousScreen: ScreenState.PLAYLIST_DETAILS,
                  })
                }
              >
                <Text style={styles.indexText}>{index + 1}</Text>

                <View style={styles.videoThumbWrap}>
                  <Image
                    source={{ uri: video.thumbnailUrl }}
                    style={styles.videoThumb}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={styles.videoDuration}>
                    {video.durationText}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <KidsEmptyState
            title="No Videos in Playlist"
            subtitle="Ask your parent to approve videos for this playlist."
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  thumbnailWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playAllButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.kidsPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Dimensions.radiusPill,
  },
  playAllText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  playlistTitle: {
    ...Typography.headlineLarge,
    fontSize: 20,
    fontWeight: '900',
    color: Colors.kidsTextPrimary,
    marginTop: 14,
  },
  playlistMeta: {
    ...Typography.bodyMedium,
    color: Colors.kidsTextSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: Colors.kidsTextPrimary,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  indexText: {
    ...Typography.titleMedium,
    color: Colors.kidsSkyBlue,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  videoThumbWrap: {
    width: 100,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    ...Typography.titleMedium,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.kidsTextPrimary,
  },
  videoDuration: {
    ...Typography.labelSmall,
    color: Colors.kidsTextMuted,
    marginTop: 2,
  },
});