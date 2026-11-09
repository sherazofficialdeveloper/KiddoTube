// src/features/player/VideoPlayerScreen.tsx
import { ChildFontText as Text } from '../../components/ui/ChildFontText';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  TouchableWithoutFeedback,
  Modal,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { useContentStore } from '../../store/contentStore';
import { useScreenTimeStore } from '../../store/screenTimeStore';
import { useThemeStore } from '../../store/themeStore';
import {
  SAFE_VOLUME_MAX_PERCENT,
  useSafeVolumeStore,
} from '../../store/safeVolumeStore';
import { useEyeBreakStore } from '../../store/eyeBreakStore';
import { buildYoutubePlayerHtml, buildOfflinePlayerHtml } from '../../utils/youtube';
import { setNativeSafeVolumeEnabled } from '../../utils/safeVolumeNative';
import { downloadManager } from '../../services/download/downloadManager';
import { ScreenState } from '../../types/navigation';
import { navigate } from '../../app/navigation/navigationRef';
import { KidsCastSheet } from '../../components/layout/KidsCastSheet';
import { ParentsPasscodeModal } from '../parental/ParentsPasscodeModal';
import { ParentExtensionDialog } from '../parental/ParentExtensionDialog';
import type { VideoItem } from '../../types/models';
import type { RootStackParamList } from '../../types/navigation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * VideoPlayerScreen
 * 1:1 Pixel Clone of YouTube Kids Fullscreen Player (Screenshots 1, 4, 5).
 * 
 * Features:
 * - Immersive fullscreen video playback
 * - Tap screen to toggle overlay controls (auto-hides after 4s)
 * - Top Bar: Back arrow, channel avatar, title, subtitle, Subscribe badge, Cast icon, 3-dots menu
 * - Playback bar: Play/Pause, current time, red scrubber with knob, total duration, Next video, Fullscreen toggle
 * - Bottom Shelf: Horizontal recommended videos carousel with duration badges
 * - Floating Settings gear button at bottom right: Opens "Parents only" Passcode modal
 */

type VideoPlayerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  ScreenState.PLAYER
>;

const AnyWebView = WebView as any;

interface PlayerBridgeMessage {
  type?: string;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  volume?: number;
}

const parseDurationText = (durationText?: string | null): number => {
  if (!durationText) return 300;
  const clean = durationText.trim();
  if (clean.startsWith('PT')) {
    const match = clean.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const h = parseInt(match[1] || '0', 10);
      const m = parseInt(match[2] || '0', 10);
      const s = parseInt(match[3] || '0', 10);
      const total = h * 3600 + m * 60 + s;
      if (total > 0) return total;
    }
  }
  if (clean.includes(':')) {
    const parts = clean.split(':').map((p) => parseInt(p, 10));
    if (parts.every((p) => !isNaN(p) && p >= 0)) {
      return parts.reduce((total, part) => total * 60 + part, 0);
    }
  }
  return 300;
};

interface KidsBoldSeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  onSeekingChange?: (isSeeking: boolean) => void;
  disabled?: boolean;
}

const KidsBoldSeekBar: React.FC<KidsBoldSeekBarProps> = ({
  currentTime,
  duration,
  onSeek,
  onSeekingChange,
  disabled,
}) => {
  const safeDuration = duration > 0 ? duration : Math.max(currentTime, 300);
  const [localVal, setLocalVal] = useState<number | null>(null);

  const displayVal = localVal ?? Math.min(currentTime, safeDuration);
  const progressPercent =
    safeDuration > 0
      ? Math.min(Math.max((displayVal / safeDuration) * 100, 0), 100)
      : 0;

  return (
    <View style={styles.seekBarContainer}>
      <View style={styles.boldTrackWrapper} pointerEvents="none">
        <View style={styles.seekBackgroundTrack}>
          <View style={[styles.seekActiveTrack, { width: `${progressPercent}%` }]} />
        </View>
      </View>
      <Slider
        style={styles.nativeSlider}
        minimumValue={0}
        maximumValue={safeDuration}
        value={displayVal}
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor="#FFFFFF"
        disabled={false}
        onSlidingStart={() => {
          onSeekingChange?.(true);
        }}
        onValueChange={(val) => {
          setLocalVal(val);
        }}
        onSlidingComplete={(val) => {
          setLocalVal(null);
          onSeekingChange?.(false);
          onSeek(val);
        }}
      />
    </View>
  );
};

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
  route,
}) => {
  const { videoId, previousScreen, sourceVideoIds } = route.params;
  const isDownloadsParam = (route.params as any)?.isDownloads;
  const insets = useSafeAreaInsets();

  const approvedVideos = useContentStore((s) => s.approvedVideos);
  const selectedProfile = useContentStore((s) => s.selectedProfile);
  const downloadedVideos = useContentStore((s) => s.downloadedVideos);
  const isBackendConnected = useContentStore((s) => s.isBackendConnected);

  const isDownloadsMode = Boolean(
    isDownloadsParam ||
    (!isBackendConnected && downloadedVideos.length > 0 && downloadedVideos.some((v) => v.id === videoId))
  );

  const availableVideos = useMemo(() => {
    if (isDownloadsMode) {
      return downloadedVideos.filter((v) => !v.isBlocked);
    }
    const map = new Map<string, VideoItem>();
    approvedVideos.forEach((v) => map.set(v.id, v));
    downloadedVideos.forEach((v) => {
      if (!map.has(v.id)) map.set(v.id, v);
    });
    const videos = Array.from(map.values()).filter((v) => !v.isBlocked);
    if (!sourceVideoIds || !Array.isArray(sourceVideoIds) || sourceVideoIds.length === 0) {
      return videos;
    }
    const idSet = new Set(sourceVideoIds);
    const ordered: VideoItem[] = [];
    sourceVideoIds.forEach((id) => {
      const found = map.get(id);
      if (found && !found.isBlocked) ordered.push(found);
    });
    return ordered.length > 0 ? ordered : videos;
  }, [isDownloadsMode, downloadedVideos, approvedVideos, sourceVideoIds]);

  const remainingMinutes = useScreenTimeStore((s) => s.remainingMinutes);
  const remainingSeconds = useScreenTimeStore((s) => s.remainingSeconds);
  const recordWatchSeconds = useScreenTimeStore((s) => s.recordWatchSeconds);

  const captionsEnabled = useThemeStore((s) => s.captionsEnabled);
  const safeVolumeLoaded = useSafeVolumeStore((s) => s.isLoaded);
  const profileSafeVolumeEnabled = useSafeVolumeStore((s) =>
    s.isEnabled(selectedProfile?.id)
  );
  const safeVolumeEnabled = safeVolumeLoaded && profileSafeVolumeEnabled;
  const safeVolumeLimitPercent = SAFE_VOLUME_MAX_PERCENT;
  const eyeBreakEnabled = useThemeStore((s) => s.eyeBreakEnabled);
  const eyeBreakVisible = useEyeBreakStore((s) => s.reminderVisible);
  const setEyeBreakWatching = useEyeBreakStore((s) => s.setWatching);
  const acknowledgeEyeBreak = useEyeBreakStore((s) => s.acknowledgeReminder);
  const resetEyeBreak = useEyeBreakStore((s) => s.reset);

  const blockVideo = useContentStore((s) => s.blockVideo);
  const blockChannel = useContentStore((s) => s.blockChannel);
  const toggleSubscribeChannel = useContentStore((s) => s.toggleSubscribeChannel);
  const isChannelSubscribed = useContentStore((s) => s.isChannelSubscribed);
  const recordVideoWatched = useContentStore((s) => s.recordVideoWatched);
  const downloadVideo = useContentStore((s) => s.downloadVideo);
  const startVideoDownload = useContentStore((s) => s.startVideoDownload);
  const removeDownloadedVideo = useContentStore((s) => s.removeDownloadedVideo);
  const isDownloaded = useContentStore((s) => s.isDownloaded);
  const isDownloading = useContentStore((s) => s.isDownloading);
  const getDownloadProgress = useContentStore((s) => s.getDownloadProgress);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const isTablet = Math.min(windowWidth, windowHeight) >= 600;

  const [currentVideoId, setCurrentVideoId] = useState(videoId);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showCastSheet, setShowCastSheet] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [showTimerDialog, setShowTimerDialog] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [isBigScreen, setIsBigScreen] = useState(false);
  const [resizeFeedback, setResizeFeedback] = useState<string | null>(null);
  const [isOfflinePlayback, setIsOfflinePlayback] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [currentDurationSec, setCurrentDurationSec] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const watchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewRef = useRef<any>(null);
  const isSeekingRef = useRef(false);

  // Update current video if route param changes
  useEffect(() => {
    setCurrentVideoId(videoId);
  }, [videoId]);

  // Record video into child's Watch History
  useEffect(() => {
    if (currentVideoId) {
      recordVideoWatched(currentVideoId);
    }
  }, [currentVideoId, recordVideoWatched]);

  const currentVideo = availableVideos.find((v) => v.id === currentVideoId);
  const currentYoutubeId = currentVideo?.youtubeId;

  const isCurrentVideoDownloaded = isDownloaded(currentVideoId);
  const downloadRecord = downloadManager.getRecord(currentVideoId);
  const isVideoDownloadReallyCompleted = Boolean(
    isCurrentVideoDownloaded &&
    downloadRecord?.status === 'COMPLETED' &&
    Boolean(downloadRecord?.localUri || (currentVideo as any)?.localUri)
  );
  const localMediaUri = isVideoDownloadReallyCompleted
    ? (downloadRecord?.localUri || (currentVideo as any)?.localUri)
    : undefined;

  const isUsingOfflinePlayer = Boolean(
    isVideoDownloadReallyCompleted &&
    (isDownloadsParam || isOfflinePlayback || !isBackendConnected)
  );

  const htmlContent = useMemo(() => {
    if (isUsingOfflinePlayer && currentVideo) {
      return buildOfflinePlayerHtml(currentVideo, localMediaUri, {
        safeVolumeEnabled,
        safeVolumeLimitPercent,
        playbackSpeed,
      });
    }
    return currentYoutubeId
      ? buildYoutubePlayerHtml(currentYoutubeId, {
          safeVolumeEnabled,
          safeVolumeLimitPercent,
          captionsEnabled,
        })
      : '';
  }, [
    currentYoutubeId,
    isUsingOfflinePlayer,
    currentVideo,
    localMediaUri,
    safeVolumeEnabled,
    safeVolumeLimitPercent,
    captionsEnabled,
    playbackSpeed,
  ]);
  const durationSec =
    currentDurationSec || parseDurationText(currentVideo?.durationText);
  const currentSubscribed = currentVideo
    ? isChannelSubscribed(currentVideo.channelTitle)
    : false;

  // Auto-hide controls after exactly 5 seconds
  const resetHideControlsTimer = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  useEffect(() => {
    if (showControls && !isVideoEnded) {
      resetHideControlsTimer();
    }
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [showControls, currentVideoId, isVideoEnded]);

  useEffect(() => {
    setCurrentTimeSec(0);
    setCurrentDurationSec(0);
    setIsPlaying(true);
    setIsPlayerReady(false);
    setIsVideoEnded(false);
    isSeekingRef.current = false;
  }, [currentVideoId]);

  useEffect(() => {
    if (!eyeBreakEnabled) {
      resetEyeBreak();
      return;
    }
    setEyeBreakWatching(isPlaying && isPlayerReady);
  }, [eyeBreakEnabled, isPlaying, isPlayerReady, resetEyeBreak, setEyeBreakWatching]);

  useEffect(() => {
    if (eyeBreakVisible) {
      webViewRef.current?.injectJavaScript(
        `window.kiddoPlayerCommand && window.kiddoPlayerCommand('pause'); true;`
      );
      setIsPlaying(false);
    }
  }, [eyeBreakVisible]);

  useEffect(() => () => resetEyeBreak(), [resetEyeBreak]);

  useEffect(() => {
    setNativeSafeVolumeEnabled(safeVolumeEnabled);
  }, [safeVolumeEnabled, selectedProfile?.id]);

  useEffect(() => {
    if (!isPlayerReady) return;
    webViewRef.current?.injectJavaScript(
      `window.kiddoPlayerCommand && window.kiddoPlayerCommand('captions', ${captionsEnabled}); true;`
    );
  }, [captionsEnabled, currentVideoId, isPlayerReady]);

  useEffect(() => {
    if (!isPlayerReady) return;
    webViewRef.current?.injectJavaScript(
      `window.kiddoPlayerCommand && window.kiddoPlayerCommand('safeVolume', ${safeVolumeEnabled}); true;`
    );
  }, [safeVolumeEnabled, currentVideoId, isPlayerReady]);

  // Screen-time accounting is separate from the centralized eye-break timer.
  useEffect(() => {
    if (isPlaying && remainingSeconds > 0) {
      watchTimerRef.current = setInterval(() => {
        recordWatchSeconds(1);
      }, 1000);
    }

    return () => {
      if (watchTimerRef.current) {
        clearInterval(watchTimerRef.current);
        watchTimerRef.current = null;
      }
    };
  }, [isPlaying, remainingSeconds, recordWatchSeconds, eyeBreakEnabled]);

  const toggleLikeVideo = useContentStore((s) => s.toggleLikeVideo);
  const isVideoLiked = currentVideo?.isFavorite ?? false;

  const currentIndex = availableVideos.findIndex((v) => v.id === currentVideoId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < availableVideos.length - 1;

  const handleBack = () => {
    if (!previousScreen || previousScreen === ScreenState.HOME) {
      navigate(ScreenState.HOME);
    } else if (previousScreen === ScreenState.SEARCH) {
      navigate(ScreenState.SEARCH, { previousScreen: ScreenState.HOME });
    } else {
      try {
        navigate(previousScreen);
      } catch {
        navigate(ScreenState.HOME);
      }
    }
  };

  const handlePreviousVideo = () => {
    if (hasPrevious) {
      setCurrentVideoId(availableVideos[currentIndex - 1].id);
      resetHideControlsTimer();
    }
  };

  const handleNextVideo = () => {
    if (hasNext) {
      setCurrentVideoId(availableVideos[currentIndex + 1].id);
      resetHideControlsTimer();
    }
  };

  const handleVideoEnded = () => {
    if (hasNext) {
      setCurrentVideoId(availableVideos[currentIndex + 1].id);
      return;
    }

    if (currentVideoId) {
      setIsVideoEnded(false);
      setIsPlaying(true);
      webViewRef.current?.injectJavaScript(
        `window.kiddoPlayerCommand && window.kiddoPlayerCommand('seek', 0); window.kiddoPlayerCommand && window.kiddoPlayerCommand('play'); true;`
      );
    }
  };

  const handleToggleLike = async () => {
    if (currentVideo) {
      await toggleLikeVideo(currentVideo.id);
      resetHideControlsTimer();
    }
  };

  const isVideoDownloaded = currentVideo ? isDownloaded(currentVideo.id) : false;
  const isVideoDownloading = currentVideo ? isDownloading(currentVideo.id) : false;
  const downloadPct = currentVideo ? getDownloadProgress(currentVideo.id) : 0;

  const handleToggleDownload = async () => {
    if (!currentVideo || isVideoDownloading) return;
    if (isVideoDownloaded) {
      Alert.alert(
        'Delete Download? 🗑️',
        `Remove "${currentVideo.title}" from your device to free up storage space?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await removeDownloadedVideo(currentVideo.id);
            },
          },
        ]
      );
    } else {
      await startVideoDownload(currentVideo);
    }
    resetHideControlsTimer();
  };

  const handleCycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 0.75];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    setResizeFeedback(`Speed: ${nextSpeed}x`);
    setTimeout(() => setResizeFeedback(null), 1600);
    webViewRef.current?.injectJavaScript(
      `window.kiddoPlayerCommand && window.kiddoPlayerCommand('setSpeed', ${nextSpeed}); true;`
    );
    resetHideControlsTimer();
  };

  // Restore previous playback position for offline video resumption
  useEffect(() => {
    if (currentVideoId && isPlayerReady) {
      const record = downloadManager.getRecord(currentVideoId);
      if (record && record.lastPlaybackPositionSec > 5) {
        webViewRef.current?.injectJavaScript(
          `window.kiddoPlayerCommand && window.kiddoPlayerCommand('seek', ${record.lastPlaybackPositionSec}); true;`
        );
        const mins = Math.floor(record.lastPlaybackPositionSec / 60);
        const secs = String(Math.floor(record.lastPlaybackPositionSec % 60)).padStart(2, '0');
        setResizeFeedback(`Resumed at ${mins}:${secs}`);
        setTimeout(() => setResizeFeedback(null), 2000);
      }
    }
  }, [currentVideoId, isPlayerReady]);

  // Persist playback position periodically
  useEffect(() => {
    if (currentVideoId && currentTimeSec > 5) {
      downloadManager.savePlaybackPosition(currentVideoId, currentTimeSec);
    }
  }, [currentVideoId, currentTimeSec]);

  const toggleResizeMode = () => {
    setIsBigScreen((prev) => {
      const next = !prev;
      const label = next ? 'Big Screen' : 'Small Screen (Fit)';
      setResizeFeedback(label);
      setTimeout(() => setResizeFeedback(null), 1800);
      webViewRef.current?.injectJavaScript(
        `window.kiddoPlayerCommand && window.kiddoPlayerCommand('setResizeMode', '${next ? 'big' : 'small'}'); true;`
      );
      return next;
    });
    resetHideControlsTimer();
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  const handlePlayPause = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    const command = nextPlaying ? 'play' : 'pause';
    webViewRef.current?.injectJavaScript(
      `window.kiddoPlayerCommand && window.kiddoPlayerCommand('${command}'); true;`
    );
    resetHideControlsTimer();
  };

  const handlePlayerMessage = (event: { nativeEvent: { data: string } }) => {
    let message: PlayerBridgeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as PlayerBridgeMessage;
    } catch (error) {
      console.warn('[VideoPlayer] Invalid message from YouTube player:', error);
      return;
    }

    if (message.type === 'ready') {
      setIsPlayerReady(true);
      if (durationSec > 0) {
        setCurrentDurationSec((previous) => Math.max(previous, durationSec));
      }
    } else if (message.type === 'error') {
      setIsPlayerReady(false);
      setIsPlaying(false);
    } else if (message.type === 'ended') {
      handleVideoEnded();
      return;
    }

    if (
      !isSeekingRef.current &&
      typeof message.currentTime === 'number' &&
      Number.isFinite(message.currentTime)
    ) {
      setCurrentTimeSec(Math.max(0, message.currentTime));
    }
    if (typeof message.duration === 'number' && Number.isFinite(message.duration)) {
      setCurrentDurationSec(Math.max(0, message.duration));
    }
    if (typeof message.isPlaying === 'boolean') {
      setIsPlaying(message.isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    const maxDur = durationSec > 0 ? durationSec : Math.max(time, 1);
    const targetTime = Math.max(0, Math.min(time, maxDur));
    webViewRef.current?.injectJavaScript(
      `window.kiddoPlayerCommand && window.kiddoPlayerCommand('seek', ${targetTime}); true;`
    );
    setCurrentTimeSec(targetTime);
    // Buffer for 400ms before accepting webview playback updates to prevent rubber-banding back to 0
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 400);
    resetHideControlsTimer();
  };

  const handleConfirmExtension = async (extensionMinutes: number) => {
    setShowTimerDialog(false);
    useScreenTimeStore.setState((state) => ({
      remainingMinutes: state.remainingMinutes + extensionMinutes,
      isLocked: false,
    }));
  };

  if (!currentVideo) {
    return (
      <View style={styles.root}>
        <SafeAreaView>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Video not found</Text>
        </View>
      </View>
    );
  }

  if (!isBackendConnected && !isVideoDownloadReallyCompleted && !currentYoutubeId) {
    return (
      <View style={styles.root}>
        <SafeAreaView>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.notFound}>
          <MaterialIcons name="cloud-off" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
          <Text style={styles.notFoundText}>Offline Video Not Downloaded</Text>
          <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 8, textAlign: 'center', maxWidth: 300 }}>
            This video has not been saved on your device. Please connect to the internet to watch or download it.
          </Text>
        </View>
      </View>
    );
  }

  const recommendedVideos = availableVideos.filter(
    (v) => !v.isBlocked && v.id !== currentVideoId
  );

  // Format time display
  const formatTime = (secs: number) => {
    const wholeSeconds = Math.max(0, Math.floor(secs));
    const m = Math.floor(wholeSeconds / 60);
    const s = wholeSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalDuration = durationSec > 0
    ? formatTime(durationSec)
    : currentVideo.durationText || '0:00';

  return (
    <View style={styles.root} testID="kids_video_player_screen">
      <StatusBar hidden />

      {/* Video View (Small Screen 16:9 centered with black bars, or Big Screen edge-to-edge) */}
      <View
        style={[
          styles.videoPlayerContainer,
          isBigScreen
            ? { width: '100%', height: '100%' }
            : isLandscape
            ? {
                width: Math.min(windowWidth, Math.round(windowHeight * (16 / 9))),
                height: '100%',
                alignSelf: 'center',
              }
            : {
                width: '100%',
                height: Math.round(windowWidth * (9 / 16)),
                alignSelf: 'center',
              },
        ]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <AnyWebView
            key={`${currentVideoId}_${isUsingOfflinePlayer ? 'offline' : 'online'}`}
            ref={webViewRef}
            source={{
              html: htmlContent,
              baseUrl: isUsingOfflinePlayer ? 'file:///' : 'https://www.youtube-nocookie.com',
            }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            cacheEnabled
            cacheMode="LOAD_CACHE_ELSE_NETWORK"
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            mixedContentMode="always"
            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            onShouldStartLoadWithRequest={(request: any) => {
              if (
                request.url.startsWith('https://www.youtube-nocookie.com/embed') ||
                request.url.startsWith('file://') ||
                request.url === 'about:blank' ||
                request.url.includes('youtube.com/iframe_api')
              ) {
                return true;
              }
              return false;
            }}
            onMessage={handlePlayerMessage}
            renderError={() => null}
          />
        </View>

        {/* Offline indicator badge */}
        {isUsingOfflinePlayer && (
          <View style={styles.offlineTopBadge} pointerEvents="none">
            <MaterialIcons name="file-download-done" size={14} color="#10B981" />
            <Text style={styles.offlineTopBadgeText}>Offline Mode</Text>
          </View>
        )}

        {/* Tap detector overlay to toggle controls */}
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View style={[styles.touchOverlay, { backgroundColor: 'rgba(0,0,0,0.01)' }]} />
        </TouchableWithoutFeedback>

        {/* Real-time screen resize indicator feedback pill */}
        {resizeFeedback && (
          <View style={styles.resizeBadge} pointerEvents="none">
            <MaterialIcons
              name={isBigScreen ? 'fullscreen-exit' : 'fullscreen'}
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.resizeBadgeText}>{resizeFeedback}</Text>
          </View>
        )}

        {/* Overlay Controls (Screenshots 4 & 5) */}
        {showControls && (
          <View style={styles.controlsOverlay} pointerEvents="box-none">
            {/* Top Bar Overlay */}
            <SafeAreaView edges={['top']} style={styles.topBarSafe}>
              <View style={styles.topBarRow}>
                {/* Back button */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={handleBack}
                  accessibilityLabel="Back"
                >
                  <MaterialIcons name="arrow-back" size={26} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Channel Avatar Circle */}
                <View style={styles.channelAvatar}>
                  <Text style={styles.channelAvatarText}>
                    {currentVideo.channelTitle ? currentVideo.channelTitle[0] : 'K'}
                  </Text>
                </View>

                {/* Title & Channel Subtitle */}
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.videoHeaderTitle} numberOfLines={1}>
                    {currentVideo.title}
                  </Text>
                  <Text style={styles.videoHeaderSubtitle} numberOfLines={1}>
                    {currentVideo.channelTitle}
                  </Text>
                </View>

                {/* Subscribe Badge (Screenshot 1 & 2) */}
                <TouchableOpacity
                  style={[
                    styles.subscribeBtn,
                    currentSubscribed && styles.subscribedBtn,
                  ]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (currentVideo?.channelTitle) {
                      await toggleSubscribeChannel(currentVideo.channelTitle);
                      resetHideControlsTimer();
                    }
                  }}
                >
                  <MaterialIcons
                    name="diamond"
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 3 }}
                  />
                  <Text style={styles.subscribeText}>
                    {currentSubscribed ? 'SUBSCRIBED' : 'SUBSCRIBE'}
                  </Text>
                </TouchableOpacity>

                {/* Compact Download Icon Button */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  activeOpacity={0.8}
                  onPress={handleToggleDownload}
                  disabled={isVideoDownloading}
                  accessibilityLabel={
                    isVideoDownloading
                      ? `Downloading ${downloadPct}%`
                      : isVideoDownloaded
                      ? 'Downloaded offline'
                      : 'Download video'
                  }
                >
                  {isVideoDownloading ? (
                    <ActivityIndicator size="small" color="#38BDF8" />
                  ) : isVideoDownloaded ? (
                    <MaterialIcons name="check-circle" size={24} color="#10B981" />
                  ) : (
                    <MaterialIcons name="file-download" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                {/* Right: Cast icon & 3-dots */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setShowCastSheet(true)}
                >
                  <MaterialIcons name="cast" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setShowActionMenu(true)}
                >
                  <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Edge Previous and Next Navigation Buttons (Matching Screenshots 1 & 2) */}
            {hasPrevious && (
              <TouchableOpacity
                style={styles.leftEdgeNavBtn}
                onPress={handlePreviousVideo}
                accessibilityLabel="Previous video"
                activeOpacity={0.8}
              >
                <MaterialIcons name="skip-previous" size={36} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {hasNext && (
              <TouchableOpacity
                style={styles.rightEdgeNavBtn}
                onPress={handleNextVideo}
                accessibilityLabel="Next video"
                activeOpacity={0.8}
              >
                <MaterialIcons name="skip-next" size={36} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Bottom Controls and Suggested Videos Shelf */}
            <View
              style={[
                styles.bottomAreaContainer,
                { paddingBottom: Math.max(insets.bottom, isTablet ? 36 : 28) },
              ]}
            >
              {/* Scrubber & Playback Controls Bar */}
              <View style={styles.playbackControlsRow}>
                {/* Play / Pause Button on Left (Matches Screenshots 1 & 2) */}
                <TouchableOpacity
                  style={styles.bottomControlBtn}
                  onPress={handlePlayPause}
                  disabled={!isPlayerReady && !isOfflinePlayback}
                  accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
                >
                  <MaterialIcons
                    name={isPlaying ? 'pause' : 'play-arrow'}
                    size={30}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                {/* Current Time */}
                <Text style={styles.timeText}>{formatTime(currentTimeSec)}</Text>

                {/* Scrubber / Seek Bar: 8px Bold Red track + white circle thumb (Matches Screenshots 1 & 2) */}
                <KidsBoldSeekBar
                  currentTime={currentTimeSec}
                  duration={durationSec}
                  onSeek={handleSeek}
                  onSeekingChange={(isSeeking) => {
                    isSeekingRef.current = isSeeking;
                    if (isSeeking) {
                      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
                    } else {
                      resetHideControlsTimer();
                    }
                  }}
                  disabled={durationSec <= 0}
                />

                {/* Total Duration */}
                <Text style={styles.timeText}>{totalDuration}</Text>

                {/* Screen Resize Button (Small 16:9 vs Big Fullscreen - Matches Screenshots 1 & 2) */}
                <TouchableOpacity
                  style={styles.bottomResizeBtn}
                  onPress={toggleResizeMode}
                  accessibilityLabel={isBigScreen ? 'Switch to small screen' : 'Switch to big screen'}
                >
                  <MaterialIcons
                    name={isBigScreen ? 'fullscreen-exit' : 'fullscreen'}
                    size={28}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              {/* Bottom Shelf of Suggested Videos (Screenshots 4 & 5) */}
              <View style={[styles.bottomShelfWrap, isTablet && { height: 140 }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.bottomShelfScroll}
                  decelerationRate={0.92}
                >
                  {recommendedVideos.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.shelfCard, isTablet && { width: 190, height: 116 }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setCurrentVideoId(item.id);
                        resetHideControlsTimer();
                      }}
                    >
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.shelfThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.shelfDurationBadge}>
                        <Text style={styles.shelfDurationText}>
                          {item.durationText || '05:00'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

      </View>

      {/* Cast Device Bottom Sheet */}
      <KidsCastSheet
        visible={showCastSheet}
        onDismiss={() => setShowCastSheet(false)}
      />

      {/* "Parents only" Passcode Modal (Screenshot 3) */}
      <ParentsPasscodeModal
        visible={showPasscodeModal}
        onDismiss={() => setShowPasscodeModal(false)}
        onSuccess={() => {
          setShowPasscodeModal(false);
          setShowTimerDialog(true);
        }}
      />

      {/* Screen Time Timer Dialog */}
      <ParentExtensionDialog
        visible={showTimerDialog}
        onDismiss={() => setShowTimerDialog(false)}
        onConfirmExtension={handleConfirmExtension}
      />

      {/* 3-Dots Action Sheet Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowActionMenu(false)}>
          <View style={styles.actionModalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.actionModalSheet}>
                <View style={styles.actionModalHeader}>
                  <Text style={styles.actionModalTitle}>Video Options</Text>
                  <TouchableOpacity onPress={() => setShowActionMenu(false)}>
                    <MaterialIcons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Option 1: Download / Delete Download */}
                <TouchableOpacity
                  style={styles.actionModalItem}
                  onPress={() => {
                    setShowActionMenu(false);
                    handleToggleDownload();
                  }}
                  disabled={isVideoDownloading}
                >
                  <MaterialIcons
                    name={
                      isVideoDownloading
                        ? 'cloud-download'
                        : isVideoDownloaded
                        ? 'check-circle'
                        : 'file-download'
                    }
                    size={22}
                    color={
                      isVideoDownloading
                        ? '#0284C7'
                        : isVideoDownloaded
                        ? '#10B981'
                        : '#3B82F6'
                    }
                  />
                  <View style={styles.actionModalItemTextWrap}>
                    <Text style={styles.actionModalItemTitle}>
                      {isVideoDownloading
                        ? `Downloading (${downloadPct}%)`
                        : isVideoDownloaded
                        ? 'Remove Download from Device'
                        : 'Download for Offline Watching'}
                    </Text>
                    <Text style={styles.actionModalItemSub}>
                      {isVideoDownloaded
                        ? 'Saved on device • Tap to delete'
                        : 'Watch without internet connection'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: Like / Favorite Video */}
                <TouchableOpacity
                  style={styles.actionModalItem}
                  onPress={async () => {
                    setShowActionMenu(false);
                    await handleToggleLike();
                  }}
                >
                  <MaterialIcons
                    name={isVideoLiked ? 'favorite' : 'favorite-border'}
                    size={22}
                    color={isVideoLiked ? '#EF4444' : '#64748B'}
                  />
                  <View style={styles.actionModalItemTextWrap}>
                    <Text style={styles.actionModalItemTitle}>
                      {isVideoLiked ? 'Remove from Liked Videos' : 'Like This Video'}
                    </Text>
                    <Text style={styles.actionModalItemSub}>
                      {isVideoLiked ? 'Saved in Your Favorites' : 'Add to your favorite videos list'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option 3: Block Video */}
                <TouchableOpacity
                  style={styles.actionModalItem}
                  onPress={() => {
                    Alert.alert(
                      'Block Video',
                      `Do you want to block "${currentVideo.title}" from your feed?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Block Video',
                          style: 'destructive',
                          onPress: async () => {
                            setShowActionMenu(false);
                            await blockVideo(currentVideo.id);
                            handleBack();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="block" size={22} color="#EF4444" />
                  <View style={styles.actionModalItemTextWrap}>
                    <Text style={styles.actionModalItemTitle}>Block This Video</Text>
                    <Text style={styles.actionModalItemSub}>Don't show this video again</Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: Block Channel */}
                <TouchableOpacity
                  style={styles.actionModalItem}
                  onPress={() => {
                    Alert.alert(
                      'Block Channel',
                      `Block all videos from "${currentVideo.channelTitle}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Block Channel',
                          style: 'destructive',
                          onPress: async () => {
                            setShowActionMenu(false);
                            await blockChannel(currentVideo.channelTitle);
                            handleBack();
                          },
                        },
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="remove-circle-outline" size={22} color="#DC2626" />
                  <View style={styles.actionModalItemTextWrap}>
                    <Text style={styles.actionModalItemTitle}>
                      Block Channel: {currentVideo.channelTitle}
                    </Text>
                    <Text style={styles.actionModalItemSub}>Hide all content from this creator</Text>
                  </View>
                </TouchableOpacity>

                {/* Option 3: Subscribe / Unsubscribe */}
                <TouchableOpacity
                  style={[styles.actionModalItem, styles.actionModalItemLast]}
                  onPress={async () => {
                    await toggleSubscribeChannel(currentVideo.channelTitle);
                    setShowActionMenu(false);
                  }}
                >
                  <MaterialIcons
                    name={currentSubscribed ? 'notifications-off' : 'notifications-active'}
                    size={22}
                    color="#0284C7"
                  />
                  <View style={styles.actionModalItemTextWrap}>
                    <Text style={styles.actionModalItemTitle}>
                      {currentSubscribed ? 'Unsubscribe from Channel' : 'Subscribe to Channel'}
                    </Text>
                    <Text style={styles.actionModalItemSub}>
                      {currentSubscribed ? 'Remove from saved favorite channels' : 'Save as favorite channel'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Eye-Break Reminder Modal */}
      <Modal
        visible={eyeBreakVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          acknowledgeEyeBreak();
          webViewRef.current?.injectJavaScript(
            `window.kiddoPlayerCommand && window.kiddoPlayerCommand('play'); true;`
          );
          setIsPlaying(true);
        }}
      >
        <View style={styles.actionModalBackdrop}>
          <View style={styles.eyeBreakCard}>
            <Text style={styles.eyeBreakEmoji}>👀 🎈</Text>
            <Text style={styles.eyeBreakTitle}>Time for an Eye Break! 👀</Text>
            <Text style={styles.eyeBreakMessage}>
              You've been watching videos for 20 minutes. Give your eyes a little rest!
            </Text>
            <Text style={styles.eyeBreakMessage}>
              Look at something 20 feet away for 20 seconds.
            </Text>
            <TouchableOpacity
              style={styles.eyeBreakButton}
              activeOpacity={0.85}
              onPress={() => {
                acknowledgeEyeBreak();
                webViewRef.current?.injectJavaScript(
                  `window.kiddoPlayerCommand && window.kiddoPlayerCommand('play'); true;`
                );
                setIsPlaying(true);
              }}
            >
              <Text style={styles.eyeBreakButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPlayerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  endedVideoCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  endedVideoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    justifyContent: 'space-between',
  },
  topBarSafe: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFBE00',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 8,
  },
  channelAvatarText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E1E1E',
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  videoHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  videoHeaderSubtitle: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 1,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  downloadedBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  downloadingBtn: {
    backgroundColor: '#0284C7',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  downloadedText: {
    color: '#10B981',
  },
  downloadBanner: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0284C7',
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 99,
  },
  downloadBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  downloadBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  downloadBannerTrack: {
    width: 200,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  downloadBannerFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  offlineTopBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    zIndex: 10,
    gap: 6,
  },
  offlineTopBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  likedBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  likeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  likedText: {
    color: '#EF4444',
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E52E2E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
  },
  subscribedBtn: {
    backgroundColor: '#475569',
  },
  subscribeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  leftEdgeNavBtn: {
    position: 'absolute',
    left: 18,
    top: '38%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  rightEdgeNavBtn: {
    position: 'absolute',
    right: 18,
    top: '38%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  seekBarContainer: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    marginHorizontal: 8,
    position: 'relative',
  },
  nativeSlider: {
    width: '100%',
    height: 36,
  },
  boldTrackWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 14,
    height: 10,
    justifyContent: 'center',
  },
  seekBackgroundTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
    width: '100%',
  },
  seekActiveTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  seekThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    top: 7,
    marginLeft: -11,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  offlinePlayerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  offlineBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 6,
  },
  offlineBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomAreaContainer: {
    width: '100%',
  },
  playbackControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomControlBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginRight: 6,
  },
  bottomControlBtnDisabled: {
    opacity: 0.4,
  },
  bottomResizeBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginLeft: 6,
  },
  bottomSpeedBtn: {
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  bottomSpeedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  resizeBadge: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 100,
  },
  resizeBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playPauseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  scrubber: {
    flex: 1,
    height: 36,
    marginHorizontal: 4,
  },
  bottomShelfWrap: {
    height: 108,
    position: 'relative',
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomShelfScroll: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
    paddingRight: 64, // leave room for floating gear button
  },
  shelfCard: {
    width: 136,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  shelfThumb: {
    width: '100%',
    height: '100%',
  },
  shelfDurationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  shelfDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  floatingSettingsGear: {
    position: 'absolute',
    right: 14,
    bottom: 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  backButton: {
    padding: 16,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  floatingBackSafe: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 999,
  },
  floatingBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  actionModalItemLast: {
    borderBottomWidth: 0,
  },
  actionModalItemTextWrap: {
    marginLeft: 14,
    flex: 1,
  },
  actionModalItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionModalItemSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  eyeBreakCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  eyeBreakEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  eyeBreakTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  eyeBreakMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  eyeBreakButton: {
    backgroundColor: '#3A9BE8',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  eyeBreakButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});