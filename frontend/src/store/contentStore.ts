import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { Api } from '../services/api';
import { downloadManager } from '../services/download/downloadManager';
import type {
  VideoItem,
  ChannelItem,
  PlaylistItem,
  ChildProfile,
  ChildSession,
  SearchResultBundle,
} from '../types/models';
import { VideoCategory } from '../types/models';
import { secureStorage } from '../services/storage/secureStorage';

interface ContentState {
  // Data
  approvedVideos: VideoItem[];
  approvedChannels: ChannelItem[];
  approvedPlaylists: PlaylistItem[];
  allRawVideos: VideoItem[];
  allRawChannels: ChannelItem[];
  childProfiles: ChildProfile[];
  selectedProfile: ChildProfile | null;
  session: ChildSession;
  isBackendConnected: boolean;
  likedVideoIds: string[];
  blockedVideoIds: string[];
  blockedChannelTitles: string[];
  subscribedChannelTitles: string[];
  watchedVideoIds: string[];
  downloadedVideos: VideoItem[];
  downloadProgress: Record<string, number>;
  activeDownloadingIds: string[];
  activeDownloadingVideos: VideoItem[];

  // Auth token
  childToken: string | null;

  // Actions
  initializeAppData: () => Promise<boolean>;
  recordVideoWatched: (videoId: string) => Promise<void>;
  
  // 1. UPDATE: We added an optional `directMp4Url` parameter here
  downloadVideo: (video: VideoItem, directMp4Url?: string) => Promise<boolean>;
  startVideoDownload: (video: VideoItem, directMp4Url?: string) => Promise<boolean>;
  
  removeDownloadedVideo: (videoId: string) => Promise<void>;
  isDownloaded: (videoId: string) => boolean;
  isDownloading: (videoId: string) => boolean;
  getDownloadProgress: (videoId: string) => number;
  loginChild: (username: string, passwordOrPin: string, profileId?: string | null) => Promise<{ success: boolean; error?: string }>;
  logoutChild: () => void;
  selectProfile: (profile: ChildProfile) => void;
  fetchApprovedContent: (token?: string) => Promise<void>;
  refreshOnlineContent: () => Promise<boolean>;
  getVideosForCategory: (category: VideoCategory) => VideoItem[];
  getVideosForChannel: (channelTitle: string) => VideoItem[];
  getVideosForPlaylist: (playlist: PlaylistItem) => VideoItem[];
  getChannelById: (id: string) => ChannelItem | undefined;
  getPlaylistById: (id: string) => PlaylistItem | undefined;
  getVideoById: (id: string) => VideoItem | undefined;
  searchApprovedContent: (query: string) => SearchResultBundle;
  addApprovedVideo: (video: VideoItem) => void;
  blockOrRemoveVideo: (id: string) => void;
  blockVideo: (id: string) => Promise<void>;
  unblockVideo: (id: string) => Promise<void>;
  blockChannel: (channelTitle: string) => Promise<void>;
  unblockChannel: (channelTitle: string) => Promise<void>;
  toggleSubscribeChannel: (channelTitle: string) => Promise<boolean>;
  isChannelSubscribed: (channelTitle: string) => boolean;
  getCurrentToken: () => string | null;
  toggleLikeVideo: (videoId: string) => Promise<void>;
  updateCurrentChildAvatar: (avatarEmoji: string, colorHex?: number) => Promise<{ success: boolean; error?: string }>;
}

const initialSession: ChildSession = {
  isAuthenticated: false,
  username: '',
  profile: null,
};

export const useContentStore = create<ContentState>((set, get) => ({
  approvedVideos: [],
  approvedChannels: [],
  approvedPlaylists: [],
  allRawVideos: [],
  allRawChannels: [],
  childProfiles: [],
  selectedProfile: null,
  session: initialSession,
  isBackendConnected: false,
  childToken: null,
  likedVideoIds: [],
  blockedVideoIds: [],
  blockedChannelTitles: [],
  subscribedChannelTitles: [],
  watchedVideoIds: [],
  downloadedVideos: [],
  downloadProgress: {},
  activeDownloadingIds: [],
  activeDownloadingVideos: [],

  isDownloaded: (videoId: string): boolean => {
    return downloadManager.isDownloaded(videoId);
  },

  isDownloading: (videoId: string): boolean => {
    return downloadManager.isDownloading(videoId) || get().activeDownloadingIds.includes(videoId);
  },

  getDownloadProgress: (videoId: string): number => {
    return downloadManager.getDownloadProgress(videoId) || get().downloadProgress[videoId] || 0;
  },

  // 2. UPDATE: Passing directMp4Url to downloadManager if it's provided
  startVideoDownload: async (video: VideoItem, directMp4Url?: string): Promise<boolean> => {
    if (!video || !video.id) return false;
    
    // Create a modified video object containing the direct streaming URL
    const videoWithDirectLink = { ...video };
    if (directMp4Url) {
      // Assuming your downloadManager.startDownload uses video.videoUrl or similar to download
      // Injecting the raw mp4 URL here so DownloadManager doesn't call Hostinger
      (videoWithDirectLink as any).videoUrl = directMp4Url;
    }
    
    return await downloadManager.startDownload(videoWithDirectLink);
  },

  downloadVideo: async (video: VideoItem, directMp4Url?: string): Promise<boolean> => {
    return get().startVideoDownload(video, directMp4Url);
  },

  removeDownloadedVideo: async (videoId: string): Promise<void> => {
    await downloadManager.deleteDownload(videoId);
    const current = get().downloadedVideos;
    const updated = current.filter((v) => v.id !== videoId);
    set({ downloadedVideos: updated });
    try {
      await AsyncStorage.setItem('@kids_downloaded_videos', JSON.stringify(updated));
    } catch (e: any) {
      console.warn('[ContentStore] Remove downloaded video failed:', e.message);
    }
  },

  initializeAppData: async (): Promise<boolean> => {
    let connected = false;

    const withTimeout = <T>(promise: Promise<T>, ms = 1200): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), ms)
        ),
      ]);

    try {
      const [
        rawLiked,
        rawBlockedVids,
        rawBlockedChannels,
        rawSubscribed,
        rawWatchHistory,
        rawDownloads,
        rawCachedProfiles,
        rawCachedVideos,
        rawCachedChannels,
        rawCachedPlaylists,
        rawCachedSession,
      ] = await Promise.all([
        AsyncStorage.getItem('@kids_liked_video_ids'),
        AsyncStorage.getItem('@kids_blocked_videos'),
        AsyncStorage.getItem('@kids_blocked_channels'),
        AsyncStorage.getItem('@kids_subscribed_channels'),
        AsyncStorage.getItem('@kids_watch_history_ids'),
        AsyncStorage.getItem('@kids_downloaded_videos'),
        AsyncStorage.getItem('@kids_cached_child_profiles'),
        AsyncStorage.getItem('@kids_cached_approved_videos'),
        AsyncStorage.getItem('@kids_cached_approved_channels'),
        AsyncStorage.getItem('@kids_cached_approved_playlists'),
        AsyncStorage.getItem('@kids_cached_child_session'),
      ]);

      if (rawLiked) set({ likedVideoIds: JSON.parse(rawLiked) });
      if (rawBlockedVids) set({ blockedVideoIds: JSON.parse(rawBlockedVids) });
      if (rawBlockedChannels) set({ blockedChannelTitles: JSON.parse(rawBlockedChannels) });
      if (rawSubscribed) set({ subscribedChannelTitles: JSON.parse(rawSubscribed) });
      if (rawWatchHistory) set({ watchedVideoIds: JSON.parse(rawWatchHistory) });
      if (rawDownloads) {
        try {
          const parsed = JSON.parse(rawDownloads);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((v: any) => downloadManager.isDownloaded(v.id));
            set({ downloadedVideos: valid });
          }
        } catch {}
      }

      downloadManager.subscribe((records) => {
        const completed = Object.values(records)
          .filter((r) => r.status === 'COMPLETED' && Boolean(r.localUri) && r.video)
          .map((r) => ({
            ...r.video!,
            localUri: r.localUri || r.video!.localUri,
          }));

        const active = Object.values(records)
          .filter((r) => r.status === 'DOWNLOADING')
          .map((r) => r.video!);

        const progressMap: Record<string, number> = {};
        Object.values(records).forEach((r) => {
          progressMap[r.id] = r.progressPercent;
        });

        set({
          downloadedVideos: completed,
          activeDownloadingIds: active.map((a) => a.id),
          activeDownloadingVideos: active,
          downloadProgress: progressMap,
        });

        AsyncStorage.setItem('@kids_downloaded_videos', JSON.stringify(completed)).catch(() => {});
      });

      if (rawCachedProfiles) {
        const cachedProfiles = JSON.parse(rawCachedProfiles);
        if (Array.isArray(cachedProfiles) && cachedProfiles.length > 0) {
          set({ childProfiles: cachedProfiles, selectedProfile: cachedProfiles[0] });
        }
      }
      if (rawCachedSession) {
        const cs = JSON.parse(rawCachedSession);
        if (cs && cs.isAuthenticated) {
          set({ session: cs, selectedProfile: cs.profile ?? get().selectedProfile });
        }
      }
    } catch (e: any) {
      console.warn('[ContentStore] Local cache load warning:', e.message);
    }

    try {
      const health = await withTimeout(Api.getHealth(), 1200);
      if (health.status === 'ok') {
        connected = true;
        set({ isBackendConnected: true });
      }
    } catch (e: any) {
      set({
        isBackendConnected: false,
        approvedVideos: [],
        approvedChannels: [],
        approvedPlaylists: [],
      });
    }

    const savedToken = await secureStorage.getChildToken();
    if (savedToken) {
      set({ childToken: savedToken });
      if (connected) {
        try {
          const auth = await withTimeout(Api.getCurrentUser(), 1200);
          const details = auth.user?.details;
          if (
            auth.authenticated &&
            auth.user?.role === 'CHILD' &&
            auth.user.childId &&
            details &&
            typeof details.avatarEmoji === 'string' &&
            typeof details.colorHex === 'number'
          ) {
            const profile: ChildProfile = {
              id: auth.user.childId,
              name: typeof details.displayName === 'string' ? details.displayName : auth.user.username,
              avatarEmoji: details.avatarEmoji,
              colorHex: details.colorHex,
              dailyLimitMinutes: 60,
              minutesWatchedToday: 0,
            };
            const currentSession = { isAuthenticated: true, username: profile.name, profile };
            set({ selectedProfile: profile, session: currentSession });
            AsyncStorage.setItem('@kids_cached_child_session', JSON.stringify(currentSession)).catch(() => {});
          } else {
            set({ childToken: null });
            await secureStorage.clearChildToken();
            await AsyncStorage.removeItem('@kids_cached_child_session');
          }
        } catch {
          console.warn('[ContentStore] Using cached session.');
        }
      }

      if (!get().session.isAuthenticated) {
        const fallbackProfile: ChildProfile = get().selectedProfile || get().childProfiles[0] || {
          id: 'offline_child',
          name: 'Child Explorer',
          username: 'Child Explorer',
          avatarEmoji: '🚀',
          colorHex: 0xff00a6fb,
          dailyLimitMinutes: 60,
          minutesWatchedToday: 0,
        };
        const offlineSession = { isAuthenticated: true, username: fallbackProfile.name, profile: fallbackProfile };
        set({ session: offlineSession, selectedProfile: fallbackProfile });
        AsyncStorage.setItem('@kids_cached_child_session', JSON.stringify(offlineSession)).catch(() => {});
      }
    }

    if (connected) {
      try {
        const profileResponse = await withTimeout(Api.getChildProfiles(), 1200);
        if (profileResponse.success && profileResponse.profiles.length > 0) {
          const mapped: ChildProfile[] = profileResponse.profiles.map((dto: any) => ({
            id: dto.id,
            name: dto.name,
            username: dto.username || dto.name,
            avatarEmoji: dto.avatarEmoji,
            colorHex: dto.colorHex,
            ageGroup: dto.ageGroup,
            dailyLimitMinutes: dto.dailyLimitMinutes,
            minutesWatchedToday: 0,
            parentId: dto.parentId,
          }));
          set((state) => ({ childProfiles: mapped, selectedProfile: state.selectedProfile ?? mapped[0] ?? null }));
          AsyncStorage.setItem('@kids_cached_child_profiles', JSON.stringify(mapped)).catch(() => {});
        }
      } catch (e: any) {}

      try {
        const contentResponse = await withTimeout(Api.getApprovedContent(), 1500);
        if (contentResponse.success) {
          applyContentResponse(contentResponse, set, get().likedVideoIds);
          const st = get();
          AsyncStorage.setItem('@kids_cached_approved_videos', JSON.stringify(st.approvedVideos)).catch(() => {});
          AsyncStorage.setItem('@kids_cached_approved_channels', JSON.stringify(st.approvedChannels)).catch(() => {});
          AsyncStorage.setItem('@kids_cached_approved_playlists', JSON.stringify(st.approvedPlaylists)).catch(() => {});
        }
      } catch (e: any) {}
    }

    return connected;
  },

  loginChild: async (username, passwordOrPin, profileId) => {
    const trimmedUser = username.trim();
    const cleanPass = passwordOrPin.trim();
    const { childProfiles } = get();

    let resolvedProfileId: string | null = null;
    if (trimmedUser) {
      const matched = childProfiles.find(
        (p) => p.name.toLowerCase() === trimmedUser.toLowerCase() || p.username?.toLowerCase() === trimmedUser.toLowerCase()
      );
      if (matched) resolvedProfileId = matched.id;
    } else if (profileId) {
      resolvedProfileId = profileId;
    }

    try {
      const response = await Api.loginChild({ username: trimmedUser || null, password: cleanPass || null, profileId: resolvedProfileId });
      const childData = response.child || (response as any).data;
      if (response.success && childData) {
        const profile: ChildProfile = {
          id: childData.id,
          name: childData.displayName || childData.name || childData.username,
          username: childData.username || childData.displayName || childData.name,
          avatarEmoji: childData.avatarEmoji || '🚀',
          colorHex: childData.colorHex || 0xff00a6fb,
          ageGroup: childData.ageGroup,
          dailyLimitMinutes: childData.dailyLimitMinutes || 60,
          minutesWatchedToday: 0,
          parentId: childData.parentId,
        };

        const currentSession = { isAuthenticated: true, username: profile.name, profile };
        set({ childToken: response.token ?? null, selectedProfile: profile, session: currentSession });
        AsyncStorage.setItem('@kids_cached_child_session', JSON.stringify(currentSession)).catch(() => {});
        
        const currentProfiles = get().childProfiles;
        const updatedProfiles = currentProfiles.some((p) => p.id === profile.id) ? currentProfiles.map((p) => (p.id === profile.id ? profile : p)) : [profile, ...currentProfiles];
        set({ childProfiles: updatedProfiles });
        AsyncStorage.setItem('@kids_cached_child_profiles', JSON.stringify(updatedProfiles)).catch(() => {});

        if (response.token) {
          await Promise.all([secureStorage.clearParentToken(), secureStorage.clearAdminToken()]);
          await secureStorage.setChildToken(response.token);
        }

        try { await get().fetchApprovedContent(response.token ?? undefined); } catch (fetchErr: any) {}
        return { success: true };
      } else {
        return { success: false, error: response.error || response.message || 'Incorrect password.' };
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Unable to connect to server.' };
    }
  },

  logoutChild: () => {
    secureStorage.clearChildToken();
    AsyncStorage.removeItem('@kids_cached_child_session').catch(() => {});
    set({ childToken: null, session: initialSession, selectedProfile: null, approvedVideos: [], approvedChannels: [], approvedPlaylists: [] });
  },

  selectProfile: (profile) => {
    set({ selectedProfile: profile });
  },

  updateCurrentChildAvatar: async (avatarEmoji, colorHex) => {
    try {
      const res = await Api.updateChildAvatar(avatarEmoji, colorHex);
      if (res.success && res.child) {
        const current = get().selectedProfile;
        if (current) {
          const updated: ChildProfile = { ...current, avatarEmoji: res.child.avatarEmoji, colorHex: res.child.colorHex ?? current.colorHex };
          set((state) => ({
            selectedProfile: updated,
            session: { ...state.session, profile: updated },
            childProfiles: state.childProfiles.map((p) => p.id === updated.id ? updated : p),
          }));
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to update avatar' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  fetchApprovedContent: async (token) => {
    const activeToken = token ?? get().childToken;
    if (!activeToken) return;
    try {
      const contentResponse = await Api.getChildHome();
      if (contentResponse.success) applyContentResponse(contentResponse, set, get().likedVideoIds);
    } catch (e: any) {}
  },

  refreshOnlineContent: async (): Promise<boolean> => {
    try {
      const health = await Api.getHealth();
      if (health.status !== 'ok') {
        set({ isBackendConnected: false });
        return false;
      }
      set({ isBackendConnected: true });
      await get().fetchApprovedContent();
      const state = get();
      await Promise.all([
        AsyncStorage.setItem('@kids_cached_approved_videos', JSON.stringify(state.approvedVideos)),
        AsyncStorage.setItem('@kids_cached_approved_channels', JSON.stringify(state.approvedChannels)),
        AsyncStorage.setItem('@kids_cached_approved_playlists', JSON.stringify(state.approvedPlaylists)),
      ]);
      return true;
    } catch (e: any) {
      set({ isBackendConnected: false });
      return false;
    }
  },

  getVideosForCategory: (category) => {
    const list = get().approvedVideos.filter((v) => !v.isBlocked);
    const filtered = category === VideoCategory.ALL ? list : list.filter((v) => v.category === category);
    return [...filtered].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });
  },

  getVideosForChannel: (channelTitle) => {
    return get().approvedVideos.filter((v) => !v.isBlocked && v.channelTitle.toLowerCase() === channelTitle.trim().toLowerCase());
  },

  getVideosForPlaylist: (playlist) => {
    const active = get().approvedVideos.filter((v) => !v.isBlocked);
    const matching = active.filter((v) => playlist.videoIds?.includes(v.id));
    if (matching.length > 0) return matching;
    return active.slice(0, playlist.videoCount);
  },

  getChannelById: (id) => get().approvedChannels.find((c) => c.id === id && !c.isBlocked),
  getPlaylistById: (id) => get().approvedPlaylists.find((p) => p.id === id && !p.isBlocked),
  getVideoById: (id) => get().approvedVideos.find((v) => v.id === id && !v.isBlocked),

  searchApprovedContent: (query) => {
    if (!query.trim()) return { videos: [], channels: [], playlists: [] };
    const q = query.trim().toLowerCase();
    const matchedVideos = get().approvedVideos.filter((v) => !v.isBlocked && (v.title.toLowerCase().includes(q) || v.channelTitle.toLowerCase().includes(q) || (v.description ?? '').toLowerCase().includes(q)));
    const matchedChannels = get().approvedChannels.filter((c) => !c.isBlocked && (c.title.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)));
    const matchedPlaylists = get().approvedPlaylists.filter((p) => !p.isBlocked && (p.title.toLowerCase().includes(q) || p.channelTitle.toLowerCase().includes(q)));
    return { videos: matchedVideos, channels: matchedChannels, playlists: matchedPlaylists };
  },

  addApprovedVideo: (video) => set((state) => ({ approvedVideos: [video, ...state.approvedVideos] })),
  blockOrRemoveVideo: (id) => set((state) => ({ approvedVideos: state.approvedVideos.filter((v) => v.id !== id) })),
  
  blockVideo: async (id: string) => {
    const { blockedVideoIds, approvedVideos, allRawVideos } = get();
    const updated = Array.from(new Set([...blockedVideoIds, id]));
    const target = approvedVideos.find((v) => v.id === id);
    const updatedRaw = target && !allRawVideos.some((v) => v.id === target.id) ? [...allRawVideos, target] : allRawVideos;
    set({ blockedVideoIds: updated, allRawVideos: updatedRaw, approvedVideos: approvedVideos.filter((v) => v.id !== id) });
    try { await AsyncStorage.setItem('@kids_blocked_videos', JSON.stringify(updated)); } catch (e: any) {}
  },

  unblockVideo: async (id: string) => {
    const { blockedVideoIds, allRawVideos, blockedChannelTitles } = get();
    const updated = blockedVideoIds.filter((bid) => bid !== id);
    set({ blockedVideoIds: updated });
    try { await AsyncStorage.setItem('@kids_blocked_videos', JSON.stringify(updated)); } catch (e: any) {}
    const lowerBlockedChannels = blockedChannelTitles.map((t) => t.toLowerCase());
    const restored = allRawVideos.filter((v) => !updated.includes(v.id) && !lowerBlockedChannels.includes((v.channelTitle || '').toLowerCase()));
    if (restored.length > 0) set({ approvedVideos: restored });
  },

  blockChannel: async (channelTitle: string) => {
    const { blockedChannelTitles, approvedVideos, approvedChannels, allRawChannels } = get();
    const cleanTitle = channelTitle.trim().toLowerCase();
    const updated = Array.from(new Set([...blockedChannelTitles, channelTitle]));
    const targetCh = approvedChannels.find((c) => (c.title || '').trim().toLowerCase() === cleanTitle);
    const updatedRawCh = targetCh && !allRawChannels.some((c) => (c.title || '').trim().toLowerCase() === cleanTitle) ? [...allRawChannels, targetCh] : allRawChannels;
    set({
      blockedChannelTitles: updated,
      allRawChannels: updatedRawCh,
      approvedVideos: approvedVideos.filter((v) => (v.channelTitle || '').trim().toLowerCase() !== cleanTitle),
      approvedChannels: approvedChannels.filter((c) => (c.title || '').trim().toLowerCase() !== cleanTitle),
    });
    try { await AsyncStorage.setItem('@kids_blocked_channels', JSON.stringify(updated)); } catch (e: any) {}
  },

  unblockChannel: async (channelTitle: string) => {
    const { blockedChannelTitles, allRawVideos, allRawChannels, blockedVideoIds } = get();
    const cleanTitle = channelTitle.trim().toLowerCase();
    const updated = blockedChannelTitles.filter((t) => t.trim().toLowerCase() !== cleanTitle);
    set({ blockedChannelTitles: updated });
    try { await AsyncStorage.setItem('@kids_blocked_channels', JSON.stringify(updated)); } catch (e: any) {}
    const lowerBlocked = updated.map((t) => t.toLowerCase());
    const restoredVideos = allRawVideos.filter((v) => !blockedVideoIds.includes(v.id) && !lowerBlocked.includes((v.channelTitle || '').toLowerCase()));
    const restoredChannels = allRawChannels.filter((c) => !lowerBlocked.includes((c.title || '').toLowerCase()));
    if (restoredVideos.length > 0 || restoredChannels.length > 0) set({ approvedVideos: restoredVideos, approvedChannels: restoredChannels });
  },

  toggleSubscribeChannel: async (channelTitle: string): Promise<boolean> => {
    const { subscribedChannelTitles } = get();
    const clean = channelTitle.trim();
    const exists = subscribedChannelTitles.some((t) => t.toLowerCase() === clean.toLowerCase());
    const updated = exists ? subscribedChannelTitles.filter((t) => t.toLowerCase() !== clean.toLowerCase()) : [...subscribedChannelTitles, clean];
    set({ subscribedChannelTitles: updated });
    try { await AsyncStorage.setItem('@kids_subscribed_channels', JSON.stringify(updated)); } catch (e: any) {}
    if (!exists) {
      const match = get().approvedChannels.find((c: ChannelItem) => c.title.toLowerCase() === clean.toLowerCase());
      if (match?.id) Api.syncChannel(match.id).then((res) => { if (res.addedCount > 0) get().fetchApprovedContent(); }).catch(() => {});
    }
    return !exists;
  },

  isChannelSubscribed: (channelTitle: string): boolean => {
    const { subscribedChannelTitles } = get();
    return subscribedChannelTitles.some((t) => t.toLowerCase() === channelTitle.trim().toLowerCase());
  },

  getCurrentToken: () => get().childToken,

  toggleLikeVideo: async (videoId: string) => {
    const { likedVideoIds, approvedVideos } = get();
    const isLiked = likedVideoIds.includes(videoId);
    const updatedIds = isLiked ? likedVideoIds.filter((id) => id !== videoId) : [...likedVideoIds, videoId];
    const updatedVideos = approvedVideos.map((v) => {
      if (v.id === videoId) return { ...v, isFavorite: !isLiked, likesCount: Math.max(0, (v.likesCount ?? 0) + (isLiked ? -1 : 1)) };
      return v;
    });
    set({ likedVideoIds: updatedIds, approvedVideos: updatedVideos });
    try { await AsyncStorage.setItem('@kids_liked_video_ids', JSON.stringify(updatedIds)); } catch (err: any) {}
  },

  recordVideoWatched: async (videoId: string) => {
    if (!videoId) return;
    const current = get().watchedVideoIds;
    const updated = [videoId, ...current.filter((id) => id !== videoId)].slice(0, 50);
    set({ watchedVideoIds: updated });
    try { await AsyncStorage.setItem('@kids_watch_history_ids', JSON.stringify(updated)); } catch (e: any) {}
  },
}));

function applyContentResponse(response: any, set: (partial: any) => void, likedIds: string[] = []): void {
  const { blockedVideoIds, blockedChannelTitles, selectedProfile } = useContentStore.getState();
  const currentChildId = selectedProfile?.id;
  const isAudienceAllowed = (item: any) => {
    if (!currentChildId) return true;
    if (!item.childIds || !Array.isArray(item.childIds) || item.childIds.length === 0) return true;
    return item.childIds.map(String).includes(String(currentChildId));
  };
  const lowerBlockedChannels = blockedChannelTitles.map((t) => t.toLowerCase());

  const videos = (response.videos ?? [])
    .map((v: any) => mapVideoDto(v, likedIds))
    .filter((v: VideoItem) => isAudienceAllowed(v) && !blockedVideoIds.includes(v.id) && !lowerBlockedChannels.includes((v.channelTitle || '').toLowerCase()));

  const channels = (response.channels ?? [])
    .map(mapChannelDto)
    .filter((c: ChannelItem) => isAudienceAllowed(c) && !lowerBlockedChannels.includes((c.title || '').toLowerCase()));

  const allVids = (response.videos ?? []).map((v: any) => mapVideoDto(v, likedIds));
  const allChs = (response.channels ?? []).map(mapChannelDto);

  set({
    allRawVideos: allVids,
    allRawChannels: allChs,
    approvedVideos: videos,
    approvedChannels: channels,
    approvedPlaylists: (response.playlists ?? []).map(mapPlaylistDto).filter(isAudienceAllowed),
  });
}

function mapVideoDto(dto: any, likedIds: string[] = []): VideoItem {
  const isFav = likedIds.includes(dto.id) || dto.isFavorite === true;
  return {
    id: dto.id,
    youtubeId: dto.youtubeId,
    title: dto.title,
    channelTitle: dto.channelTitle,
    thumbnailUrl: dto.thumbnailUrl,
    durationText: dto.durationText,
    category: parseCategory(dto.category),
    description: dto.description ?? '',
    childIds: (dto.childIds ?? []).map(String),
    createdAt: dto.createdAt,
    isBlocked: dto.isBlocked ?? false,
    isFavorite: isFav,
    likesCount: isFav ? 1 : 0,
  };
}

function mapChannelDto(dto: any): ChannelItem {
  return {
    id: dto.id,
    title: dto.title,
    avatarUrl: dto.avatarUrl,
    videoCount: dto.videoCount,
    colorAccentHex: dto.colorAccentHex ?? 0xff00a6fb,
    description: dto.description ?? '',
    childIds: (dto.childIds ?? []).map(String),
    isBlocked: dto.isBlocked ?? false,
  };
}

function mapPlaylistDto(dto: any): PlaylistItem {
  return {
    id: dto.id,
    title: dto.title,
    channelTitle: dto.channelTitle,
    thumbnailUrl: dto.thumbnailUrl,
    videoCount: dto.videoCount,
    videoIds: dto.videoIds ?? [],
    childIds: (dto.childIds ?? []).map(String),
    isBlocked: dto.isBlocked ?? false,
  };
}

function parseCategory(raw: string): VideoCategory {
  const upper = (raw ?? '').toUpperCase();
  if (upper in VideoCategory) {
    return upper as VideoCategory;
  }
  return VideoCategory.ALL;
}

export const selectApprovedVideos = (s: ContentState) => s.approvedVideos;
export const selectApprovedChannels = (s: ContentState) => s.approvedChannels;
export const selectApprovedPlaylists = (s: ContentState) => s.approvedPlaylists;
export const selectChildProfiles = (s: ContentState) => s.childProfiles;
export const selectCurrentProfile = (s: ContentState) => s.selectedProfile;
export const selectSession = (s: ContentState) => s.session;