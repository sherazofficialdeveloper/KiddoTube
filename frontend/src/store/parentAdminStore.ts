// src/store/parentAdminStore.ts

import { create } from 'zustand';
import { Api } from '../services/api';
import { secureStorage } from '../services/storage/secureStorage';
import { useContentStore } from './contentStore';
import { useScreenTimeStore } from './screenTimeStore';
import { useSafeVolumeStore } from './safeVolumeStore';
import type {
  ParentAccountDto,
  ParentDashboardDataDto,
  ChildDetailDto,
  AdminAccountDto,
  AdminStatsDto,
  AdminParentItemDto,
  AdminChildItemDto,
  VideoItemDto,
  ChannelItemDto,
  PlaylistItemDto,
} from '../types/api';

/**
 * ParentAdminStore
 * Migrated from Kotlin ParentAdminRepository.kt
 * 
 * Handles:
 * - Parent auth + dashboard + children + content management
 * - Admin auth + oversight
 */

interface ParentAdminState {
  // Parent session
  parentToken: string | null;
  parentAccount: ParentAccountDto | null;
  parentDashboard: ParentDashboardDataDto | null;
  parentChildren: ChildDetailDto[];

  // Admin session
  adminToken: string | null;
  adminAccount: AdminAccountDto | null;
  adminDashboard: AdminStatsDto | null;
  adminParents: AdminParentItemDto[];
  adminChildrenList: AdminChildItemDto[];
  adminVideos: VideoItemDto[];
  adminChannels: ChannelItemDto[];
  adminPlaylists: PlaylistItemDto[];

  // Parent actions
  loginParent: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (
    email: string
  ) => Promise<{ success: boolean; message?: string; devOtp?: string; error?: string }>;
  resetPasswordWithOtp: (
    email: string,
    otp: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  registerParent: (
    username: string,
    email: string,
    password: string,
    pin?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logoutParent: () => Promise<void>;
  restoreSession: () => Promise<'parent' | 'admin' | null>;
  fetchParentDashboard: () => Promise<boolean>;
  fetchParentChildren: () => Promise<ChildDetailDto[]>;
  createChild: (
    username: string,
    displayName: string,
    password: string,
    avatarEmoji: string,
    colorHex: number,
    ageGroup: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateDailyLimit: (
    newLimit: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateChildDailyLimit: (
    childId: string,
    newLimit: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateParentPin: (
    currentPin: string | null,
    newPin: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateParentProfile: (
    username: string,
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  changeParentPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetChildPassword: (
    childId: string,
    newPass: string
  ) => Promise<{ success: boolean; error?: string }>;
  getChildPassword: (
    childId: string
  ) => Promise<{ success: boolean; password?: string; error?: string }>;
  deleteChild: (
    childId: string
  ) => Promise<{ success: boolean; error?: string }>;
  addVideo: (
    title: string,
    channelTitle: string,
    youtubeId: string,
    category: string,
    childIds?: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  removeVideo: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;
  addChannel: (
    title: string,
    channelUrlOrId: string,
    desc: string,
    category?: string,
    childIds?: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  removeChannel: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;
  addPlaylist: (
    title: string,
    playlistUrlOrId: string,
    channelTitle: string,
    category?: string,
    childIds?: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  removePlaylist: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Admin actions
  loginAdmin: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  fetchAdminDashboard: () => Promise<boolean>;
  fetchAdminParents: (search?: string) => Promise<AdminParentItemDto[]>;
  createParentByAdmin: (data: {
    username: string;
    email: string;
    password: string;
    displayName?: string;
    dailyLimitMinutes?: number;
    pin?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  toggleParentStatus: (
    parentId: string,
    status?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAdminParent: (
    parentId: string
  ) => Promise<{ success: boolean; error?: string }>;
  fetchAdminChildren: (search?: string) => Promise<AdminChildItemDto[]>;
  toggleChildStatus: (
    childId: string,
    status?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAdminChild: (
    childId: string
  ) => Promise<{ success: boolean; error?: string }>;
  fetchAdminContent: () => Promise<boolean>;
  moderateContent: (
    type: 'channel' | 'playlist' | 'video',
    id: string,
    action: 'BLOCK' | 'REMOVE'
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useParentAdminStore = create<ParentAdminState>((set, get) => ({
  parentToken: null,
  parentAccount: null,
  parentDashboard: null,
  parentChildren: [],

  adminToken: null,
  adminAccount: null,
  adminDashboard: null,
  adminParents: [],
  adminChildrenList: [],
  adminVideos: [],
  adminChannels: [],
  adminPlaylists: [],

  // --- PARENT OPERATIONS ---

  loginParent: async (identifier, pass) => {
    try {
      const clean = identifier.trim();
      const res = await Api.loginParent({
        username: clean,
        email: clean,
        password: pass,
      });
      if (res.success && res.data && res.token) {
        useContentStore.getState().logoutChild();
        useScreenTimeStore.getState().clearSession();
        set({
          parentToken: res.token,
          parentAccount: res.data,
          adminToken: null,
          adminAccount: null,
        });
        await Promise.all([
          secureStorage.clearAdminToken(),
          secureStorage.clearChildToken(),
        ]);
        await secureStorage.setParentToken(res.token);
        await get().fetchParentDashboard();
        await get().fetchParentChildren();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Invalid parent credentials',
      };
    } catch (e: any) {
      console.error('[ParentAdminStore] Parent login:', e.message);
      return {
        success: false,
        error:
          e.message ??
          'Unable to connect to server. Please check your network connection.',
      };
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const res = await Api.forgotPassword(email.trim());
      if (res.success) {
        return { success: true, message: res.message || 'OTP sent to your email', devOtp: res.devOtp };
      }
      return { success: false, error: res.error || 'Failed to send reset code' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to send reset code' };
    }
  },

  resetPasswordWithOtp: async (email: string, otp: string, newPassword: string) => {
    try {
      const res = await Api.resetPasswordWithOtp(email.trim(), otp.trim(), newPassword.trim());
      if (res.success) {
        return { success: true, message: res.message || 'Password reset successfully' };
      }
      return { success: false, error: res.error || 'Failed to reset password' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to reset password' };
    }
  },

  registerParent: async (user, mail, pass, pin) => {
    try {
      const res = await Api.registerParent({
        username: user,
        email: mail,
        password: pass,
        pin: pin || undefined,
      });
      if (res.success && res.data && res.token) {
        useContentStore.getState().logoutChild();
        useScreenTimeStore.getState().clearSession();
        set({
          parentToken: res.token,
          parentAccount: res.data,
          adminToken: null,
          adminAccount: null,
        });
        await Promise.all([
          secureStorage.clearAdminToken(),
          secureStorage.clearChildToken(),
        ]);
        await secureStorage.setParentToken(res.token);
        await get().fetchParentDashboard();
        await get().fetchParentChildren();
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Registration failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  logoutParent: async () => {
    try {
      await Api.logout();
    } catch (e: any) {
      console.warn('[ParentAdminStore] Parent logout:', e.message);
    }
    await secureStorage.clearParentToken();
    set({
      parentToken: null,
      parentAccount: null,
      parentDashboard: null,
      parentChildren: [],
    });
  },

  restoreSession: async () => {
    const parentToken = await secureStorage.getParentToken();
    if (parentToken) {
      set({ parentToken });
      if (await get().fetchParentDashboard()) {
        await get().fetchParentChildren();
        return 'parent';
      }
      set({ parentToken: null, parentAccount: null, parentDashboard: null });
      await secureStorage.clearParentToken();
    }

    const adminToken = await secureStorage.getAdminToken();
    if (adminToken) {
      set({ adminToken });
      if (await get().fetchAdminDashboard()) {
        await Promise.all([
          get().fetchAdminParents(),
          get().fetchAdminChildren(),
          get().fetchAdminContent(),
        ]);
        return 'admin';
      }
      set({ adminToken: null, adminAccount: null, adminDashboard: null });
      await secureStorage.clearAdminToken();
    }

    return null;
  },

  fetchParentDashboard: async () => {
    const token = get().parentToken;
    if (!token) return false;

    try {
      const res = await Api.getParentDashboard();
      if (res.success && res.data) {
        set({
          parentDashboard: res.data,
          parentAccount: res.data.parent ?? get().parentAccount,
        });
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn('[ParentAdminStore] Parent dashboard:', e.message);
      return false;
    }
  },

  fetchParentChildren: async () => {
    const token = get().parentToken;
    if (!token) return [];

    try {
      const res = await Api.getParentChildren();
      if (res.success) {
        set({ parentChildren: res.data });
        return res.data;
      }
      return [];
    } catch (e: any) {
      console.warn('[ParentAdminStore] Parent children:', e.message);
      return [];
    }
  },

  createChild: async (
    username,
    displayName,
    password,
    avatarEmoji,
    colorHex,
    ageGroup
  ) => {
    try {
      const res = await Api.createChild({
        username,
        displayName,
        password,
        avatarEmoji,
        colorHex,
        ageGroup,
      });
      if (res.success) {
        await get().fetchParentChildren();
        await get().fetchParentDashboard();
        try {
          await useContentStore.getState().initializeAppData();
        } catch {}
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to create child',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  updateDailyLimit: async (newLimit) => {
    try {
      const res = await Api.updateDailyLimit({ dailyLimitMinutes: newLimit });
      if (res.success) {
        set((state) => ({
          dailyLimit: newLimit,
          parentChildren: state.parentChildren.map((c) => ({
            ...c,
            dailyLimitMinutes: newLimit,
          })),
        }));
        await get().fetchParentDashboard();
        await get().fetchParentChildren();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to update daily limit',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  updateChildDailyLimit: async (childId, newLimit) => {
    try {
      const res = await Api.updateChild(childId, { dailyLimitMinutes: newLimit });
      if (res.success) {
        set((state) => ({
          parentChildren: state.parentChildren.map((c) =>
            c.id === childId ? { ...c, dailyLimitMinutes: newLimit } : c
          ),
        }));
        await get().fetchParentDashboard();
        await get().fetchParentChildren();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to update child limit',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  updateParentPin: async (currentPin, newPin) => {
    try {
      const res = await Api.updatePin({ currentPin: currentPin || undefined, newPin });
      if (res.success) {
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Failed to update PIN' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  updateParentProfile: async (username, email) => {
    try {
      const res = await Api.updateParentProfile({
        username,
        displayName: username,
        email,
      });
      if (res.success && res.data) {
        set((state) => ({
          parentAccount: res.data,
          parentDashboard: state.parentDashboard
            ? { ...state.parentDashboard, parent: res.data }
            : null,
        }));
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Failed to update profile' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  changeParentPassword: async (currentPassword, newPassword) => {
    try {
      const res = await Api.changeParentPassword({
        currentPassword,
        newPassword,
      });
      return res.success
        ? { success: true }
        : { success: false, error: res.error ?? 'Failed to change password' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  resetChildPassword: async (childId, newPass) => {
    try {
      const res = await Api.resetChildPassword(childId, newPass);
      if (res.success) {
        await get().fetchParentChildren();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to reset password',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getChildPassword: async (childId) => {
    try {
      const res = await Api.getChildPassword(childId);
      if (res.success && res.data?.password) {
        return { success: true, password: res.data.password };
      }
      return {
        success: false,
        error: res.error ?? 'Unable to retrieve the child password',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteChild: async (childId) => {
    try {
      const res = await Api.deleteChild(childId);
      if (res.success) {
        await useSafeVolumeStore.getState().remove(childId);
        await get().fetchParentChildren();
        await get().fetchParentDashboard();
        try {
          await useContentStore.getState().initializeAppData();
        } catch {}
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to delete child',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  addVideo: async (title, channelTitle, youtubeId, category, childIds = []) => {
    try {
      const res = await Api.addVideo({
        title,
        channelTitle,
        youtubeUrlOrId: youtubeId,
        category,
        childIds,
      });
      if (res.success) {
        await get().fetchParentDashboard();
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Failed to add video' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  removeVideo: async (id) => {
    try {
      const res = await Api.removeVideo(id);
      if (res.success) {
        await get().fetchParentDashboard();
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Failed to remove video' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  addChannel: async (title, channelUrlOrId, desc, category, childIds = []) => {
    try {
      const res = await Api.addChannel({
        title,
        channelUrlOrId,
        description: desc,
        category: category || 'SHOWS',
        childIds,
      });
      if (res.success) {
        await get().fetchParentDashboard();
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Failed to add channel' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  removeChannel: async (id) => {
    try {
      const res = await Api.removeChannel(id);
      if (res.success) {
        await get().fetchParentDashboard();
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Failed to remove channel' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  addPlaylist: async (title, playlistUrlOrId, channelTitle, category, childIds = []) => {
    try {
      const res = await Api.addPlaylist({
        title,
        playlistUrlOrId,
        channelTitle,
        category: category || 'LEARNING',
        childIds,
      });
      if (res.success) {
        await get().fetchParentDashboard();
        return { success: true };
      }
      return { success: false, error: res.error ?? 'Failed to add playlist' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  removePlaylist: async (id) => {
    try {
      const res = await Api.removePlaylist(id);
      if (res.success) {
        await get().fetchParentDashboard();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to remove playlist',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // --- ADMIN OPERATIONS ---

  loginAdmin: async (user, pass) => {
    try {
      const res = await Api.loginAdmin({ username: user, password: pass });
      if (res.success && res.data && res.token) {
        set({
          adminToken: res.token,
          adminAccount: res.data,
          parentToken: null,
          parentAccount: null,
        });
        await Promise.all([
          secureStorage.clearParentToken(),
          secureStorage.clearChildToken(),
        ]);
        await secureStorage.setAdminToken(res.token);
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Invalid admin credentials',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  logoutAdmin: async () => {
    try {
      await Api.logout();
    } catch (e: any) {
      console.warn('[ParentAdminStore] Admin logout:', e.message);
    }
    await secureStorage.clearAdminToken();
    set({
      adminToken: null,
      adminAccount: null,
      adminDashboard: null,
      adminParents: [],
      adminChildrenList: [],
      adminVideos: [],
      adminChannels: [],
      adminPlaylists: [],
    });
  },

  fetchAdminDashboard: async () => {
    const token = get().adminToken;
    if (!token) return false;
    try {
      const res = await Api.getAdminDashboard();
      if (res.success && res.data) {
        set({ adminDashboard: res.data });
        return true;
      }
      return false;
    } catch (e: any) {
      console.warn('[ParentAdminStore] Admin dashboard:', e.message);
      return false;
    }
  },

  fetchAdminParents: async (search) => {
    const token = get().adminToken;
    if (!token) return [];
    try {
      const res = await Api.getAdminParents(search);
      const responseData = res.data as unknown;
      const parents = Array.isArray(responseData)
        ? responseData
        : Array.isArray((responseData as any)?.parents)
        ? (responseData as any).parents
        : Array.isArray((responseData as any)?.items)
        ? (responseData as any).items
        : Array.isArray((res as any).parents)
        ? (res as any).parents
        : [];
      if (res.success && Array.isArray(parents)) {
        const normalizedParents = parents
          .filter(Boolean)
          .map((parent: any) => ({
            ...parent,
            id: String(parent.id ?? parent._id ?? parent.parentId ?? ''),
            username: String(parent.username ?? parent.email?.split('@')[0] ?? 'parent'),
            displayName: parent.displayName ?? null,
            childrenCount: Number(parent.childrenCount ?? 0),
          }))
          .filter((parent) => parent.id);
        set({ adminParents: normalizedParents });
        return normalizedParents;
      }
      console.warn(
        '[ParentAdminStore] Admin parents response was unsuccessful:',
        (res as any).error ?? 'Unexpected response shape'
      );
      return get().adminParents;
    } catch (error: any) {
      console.warn('[ParentAdminStore] Admin parents:', error?.message ?? error);
      return get().adminParents;
    }
  },

  createParentByAdmin: async (data) => {
    try {
      const res = await Api.createParentByAdmin(data);
      if (res.success) {
        await get().fetchAdminParents();
        await get().fetchAdminDashboard();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to create parent account',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  toggleParentStatus: async (parentId, status) => {
    try {
      const res = await Api.toggleParentStatus(parentId, status);
      if (res.success) {
        await get().fetchAdminParents();
        await get().fetchAdminDashboard();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to update status',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteAdminParent: async (parentId) => {
    try {
      const res = await Api.deleteAdminParent(parentId);
      if (res.success) {
        await Promise.all([
          get().fetchAdminParents(),
          get().fetchAdminChildren(),
          get().fetchAdminContent(),
          get().fetchAdminDashboard(),
        ]);
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to delete parent',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  fetchAdminChildren: async (search) => {
    const token = get().adminToken;
    if (!token) return [];
    try {
      const res = await Api.getAdminChildren(search);
      if (res.success) {
        set({ adminChildrenList: res.data });
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  toggleChildStatus: async (childId, status) => {
    try {
      const res = await Api.toggleChildStatus(childId, status);
      if (res.success) {
        await get().fetchAdminChildren();
        await get().fetchAdminDashboard();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to update status',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteAdminChild: async (childId) => {
    try {
      const res = await Api.deleteAdminChild(childId);
      if (res.success) {
        await useSafeVolumeStore.getState().remove(childId);
        await Promise.all([
          get().fetchAdminChildren(),
          get().fetchAdminContent(),
          get().fetchAdminDashboard(),
        ]);
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to delete child',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  fetchAdminContent: async () => {
    const token = get().adminToken;
    if (!token) return false;
    try {
      const res = await Api.getAdminContent();
      if (res.success && res.data) {
        set({
          adminChannels: res.data.channels,
          adminPlaylists: res.data.playlists,
          adminVideos: res.data.videos,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  moderateContent: async (type, id, action) => {
    try {
      if (!get().adminToken) {
        return { success: false, error: 'Admin authentication is required' };
      }
      const res = await Api.moderateContent({
        type,
        id,
        action,
      });
      if (res.success) {
        if (action === 'REMOVE') {
          if (type === 'video') {
            set((state) => ({
              adminVideos: state.adminVideos.filter((video) => video.id !== id),
            }));
          } else if (type === 'channel') {
            const channelToRemove = get().adminChannels.find((channel) => channel.id === id);
            set((state) => ({
              adminChannels: state.adminChannels.filter((channel) => channel.id !== id),
              adminVideos: state.adminVideos.filter((video) =>
                channelToRemove?.title
                  ? video.channelTitle?.trim().toLowerCase() !== channelToRemove.title.trim().toLowerCase()
                  : true
              ),
            }));
          } else {
            set((state) => ({
              adminPlaylists: state.adminPlaylists.filter((playlist) => playlist.id !== id),
            }));
          }
        }
        await get().fetchAdminContent();
        await get().fetchAdminDashboard();
        return { success: true };
      }
      return {
        success: false,
        error: res.error ?? 'Failed to moderate content',
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
}));

// Convenience selectors
export const selectParentDashboard = (s: ParentAdminState) =>
  s.parentDashboard;
export const selectParentChildren = (s: ParentAdminState) => s.parentChildren;
export const selectAdminDashboard = (s: ParentAdminState) => s.adminDashboard;
export const selectAdminParents = (s: ParentAdminState) => s.adminParents;
export const selectAdminChildren = (s: ParentAdminState) =>
  s.adminChildrenList;
export const selectAdminVideos = (s: ParentAdminState) => s.adminVideos;
export const selectAdminChannels = (s: ParentAdminState) => s.adminChannels;
export const selectAdminPlaylists = (s: ParentAdminState) => s.adminPlaylists;