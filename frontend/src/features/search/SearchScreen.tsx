// src/features/search/SearchScreen.tsx
import { ChildFontText as Text, ChildFontTextInput as TextInput } from '../../components/ui/ChildFontText';

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Dimensions } from '../../theme/dimensions';

import { KidsVideoCard } from '../../components/ui/KidsVideoCard';
import { KidsChannelCard } from '../../components/ui/KidsChannelCard';
import { KidsPlaylistCard } from '../../components/ui/KidsPlaylistCard';
import { KidsEmptyState } from '../../components/ui/KidsStatusViews';
import { UnderwaterSeabedIllustration } from '../../components/ui/UnderwaterSeabedIllustration';
import { KidsBottomNavigation } from '../../components/layout/KidsBottomNavigation';

import { useContentStore } from '../../store/contentStore';
import { ScreenState, ChildTab } from '../../types/navigation';
import { navigate } from '../../app/navigation/navigationRef';
import { goBack } from '../../app/navigation/navigationRef';
import type { RootStackParamList } from '../../types/navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * SearchScreen
 * Migrated 1:1 from Kotlin KidsSearchScreen.kt
 * 
 * - Search bar with clear button
 * - Safe-search banner
 * - Results: Channels → Playlists → Videos
 * - Empty states (initial / no results)
 */

type SearchScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenState.SEARCH
>;

export const SearchScreen: React.FC<SearchScreenProps> = ({ route }) => {
  const [query, setQuery] = useState('');

  // previousScreen is in route.params (for back navigation)
  const previousScreen = route.params?.previousScreen ?? ScreenState.HOME;

  // Derive results from content store — reactive
  const approvedVideos = useContentStore((s) => s.approvedVideos);
  const approvedChannels = useContentStore((s) => s.approvedChannels);
  const approvedPlaylists = useContentStore((s) => s.approvedPlaylists);
  const selectedProfile = useContentStore((s) => s.selectedProfile);
  const profileEmoji = selectedProfile?.avatarEmoji ?? '🦁';

  const handleTabSelected = (tab: ChildTab) => {
    switch (tab) {
      case ChildTab.HOME:
        navigate(ScreenState.HOME);
        break;
      case ChildTab.EXPLORE:
        navigate(ScreenState.EXPLORE);
        break;
      case ChildTab.SEARCH:
        // Already on Search
        break;
      case ChildTab.PROFILE:
        navigate(ScreenState.PROFILE);
        break;
    }
  };

  const results = useMemo(() => {
    if (!query.trim()) {
      return { videos: [], channels: [], playlists: [] };
    }

    const q = query.trim().toLowerCase();

    const videos = approvedVideos.filter(
      (v) =>
        !v.isBlocked &&
        (v.title.toLowerCase().includes(q) ||
          v.channelTitle.toLowerCase().includes(q) ||
          (v.description ?? '').toLowerCase().includes(q))
    );

    const channels = approvedChannels.filter(
      (c) =>
        !c.isBlocked &&
        (c.title.toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q))
    );

    const playlists = approvedPlaylists.filter(
      (p) =>
        !p.isBlocked &&
        (p.title.toLowerCase().includes(q) ||
          p.channelTitle.toLowerCase().includes(q))
    );

    return { videos, channels, playlists };
  }, [query, approvedVideos, approvedChannels, approvedPlaylists]);

  const isQueryEmpty = query.trim().length === 0;
  const hasAnyResults =
    results.videos.length > 0 ||
    results.channels.length > 0 ||
    results.playlists.length > 0;

  const handleBack = () => {
    if (previousScreen === ScreenState.HOME) {
      navigate(ScreenState.HOME);
    } else if (previousScreen === ScreenState.EXPLORE) {
      navigate(ScreenState.EXPLORE);
    } else {
      goBack();
    }
  };

  return (
    <View style={styles.root} testID="kids_search_screen">
      {/* Top bar with Back Arrow and Underline Input (Image 4) */}
      <SafeAreaView style={styles.safeTop} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            testID="search_back_button"
            accessibilityLabel="Back"
          >
            <MaterialIcons
              name="arrow-back"
              size={28}
              color="#0F172A"
            />
          </TouchableOpacity>

          <View style={styles.searchInputUnderlineWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search YouTube Kids"
              placeholderTextColor="#007791"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              testID="search_input_field"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                style={styles.actionBtn}
                accessibilityLabel="Clear Search"
              >
                <MaterialIcons
                  name="clear"
                  size={22}
                  color="#005F73"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Results / Empty seabed area */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isQueryEmpty && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        decelerationRate={0.92}
      >
        {isQueryEmpty ? (
          /* Empty state: Clean underwater seabed at bottom (Image 4) */
          <View style={styles.seabedContainer}>
            <UnderwaterSeabedIllustration />
          </View>
        ) : !hasAnyResults ? (
          <View style={styles.emptyCardWrap}>
            <KidsEmptyState
              title="No Results Found"
              subtitle={`We couldn't find "${query}" in your approved list. Try another search!`}
            />
          </View>
        ) : (
          <>
            {/* Channels */}
            {results.channels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Channels</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {results.channels.map((ch) => (
                    <KidsChannelCard
                      key={ch.id}
                      channel={ch}
                      onClick={() =>
                        navigate(ScreenState.CHANNEL_DETAILS, {
                          channelId: ch.id,
                          previousScreen: ScreenState.SEARCH,
                        })
                      }
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Playlists */}
            {results.playlists.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlists</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {results.playlists.map((pl) => (
                    <KidsPlaylistCard
                      key={pl.id}
                      playlist={pl}
                      onClick={() =>
                        navigate(ScreenState.PLAYLIST_DETAILS, {
                          playlistId: pl.id,
                          previousScreen: ScreenState.SEARCH,
                        })
                      }
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Videos */}
            {results.videos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Videos ({results.videos.length})
                </Text>
                <View style={styles.videosList}>
                  {results.videos.map((video) => (
                    <KidsVideoCard
                      key={video.id}
                      video={video}
                      onClick={() =>
                        navigate(ScreenState.PLAYER, {
                          videoId: video.id,
                          previousScreen: ScreenState.SEARCH,
                        })
                      }
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <KidsBottomNavigation
        selectedTab={ChildTab.SEARCH}
        profileEmoji={profileEmoji}
        onTabSelected={handleTabSelected}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#00BAF2',
  },
  safeTop: {
    backgroundColor: '#00BAF2',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#00BAF2',
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputUnderlineWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#007791',
    paddingBottom: 4,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollContentEmpty: {
    padding: 0,
    justifyContent: 'flex-end',
  },
  seabedContainer: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  emptyCardWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '900',
    marginBottom: 8,
  },
  horizontalScroll: {
    gap: 12,
  },
  videosList: {
    marginTop: 4,
  },
});