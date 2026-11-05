// src/services/api/kidsApi.ts

import { apiClient } from './client';
import type {
  HealthResponse,
  CurrentUserResponse,
  ParentRegisterRequest,
  ParentAuthResponse,
  ParentLoginRequest,
  ChildLoginRequest,
  ChildLoginResponse,
  AdminLoginRequest,
  AdminAuthResponse,
  GenericActionResponse,
  ChildPasswordResponse,
  ChildProfilesResponse,
  ApprovedContentResponse,
  ScreenTimeResponse,
  SyncWatchRequest,
  ExtendTimeRequest,
  PinVerifyRequest,
  PinVerifyResponse,
  ParentDashboardResponse,
  ParentChildrenResponse,
  CreateChildRequest,
  UpdateDailyLimitRequest,
  UpdatePinRequest,
  ChangePasswordRequest,
  UpdateParentProfileRequest,
  AddChannelRequest,
  AddPlaylistRequest,
  AddVideoRequest,
  AdminDashboardResponse,
  AdminParentsResponse,
  AdminChildrenResponse,
  AdminContentResponse,
  ModerateContentRequest,
  CreateParentByAdminRequest,
  CreateParentByAdminResponse,
} from '../../types/api';

/**
 * KidsStream API Service
 * Migrated 1:1 from Kotlin KidsApiService.kt (Retrofit interface)
 * 
 * All endpoints match backend contracts exactly
 */

// --- Health Probe ---
export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await apiClient.get<HealthResponse>('/api/health');
  return data;
};

// --- Authentication ---
export const registerParent = async (
  request: ParentRegisterRequest
): Promise<ParentAuthResponse> => {
  const { data } = await apiClient.post<ParentAuthResponse>(
    '/api/auth/parent/register',
    request
  );
  return data;
};

export const loginParent = async (
  request: ParentLoginRequest
): Promise<ParentAuthResponse> => {
  const { data } = await apiClient.post<ParentAuthResponse>(
    '/api/auth/parent/login',
    request
  );
  return data;
};

export const forgotPassword = async (
  email: string
): Promise<GenericActionResponse & { devOtp?: string }> => {
  const { data } = await apiClient.post<GenericActionResponse & { devOtp?: string }>(
    '/api/auth/parent/forgot-password',
    { email }
  );
  return data;
};

export const resetPasswordWithOtp = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    '/api/auth/parent/reset-password-otp',
    { email, otp, newPassword }
  );
  return data;
};

export const loginChild = async (
  request: ChildLoginRequest
): Promise<ChildLoginResponse> => {
  const { data } = await apiClient.post<ChildLoginResponse>(
    '/api/auth/child/login',
    request
  );
  return data;
};

export const loginAdmin = async (
  request: AdminLoginRequest
): Promise<AdminAuthResponse> => {
  const { data } = await apiClient.post<AdminAuthResponse>(
    '/api/auth/admin/login',
    request
  );
  return data;
};

export const logout = async (): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>('/api/auth/logout');
  return data;
};

export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  const { data } = await apiClient.get<CurrentUserResponse>('/api/auth/me');
  return data;
};

// --- Child API Endpoints ---
export const getChildProfiles = async (
  parentId?: string | null
): Promise<ChildProfilesResponse> => {
  const { data } = await apiClient.get<ChildProfilesResponse>(
    '/api/child/profiles',
    { params: { parentId } }
  );
  return data;
};

export const getChildHome = async (
  parentId?: string | null,
  category?: string | null,
  search?: string | null
): Promise<ApprovedContentResponse> => {
  const { data } = await apiClient.get<ApprovedContentResponse>(
    '/api/child/home',
    { params: { parentId, category, search } }
  );
  return data;
};

export const getChildWatchTime = async (
  parentId?: string | null,
  childId?: string | null
): Promise<ScreenTimeResponse> => {
  const { data } = await apiClient.get<ScreenTimeResponse>(
    '/api/child/watch-time',
    { params: { parentId, childId } }
  );
  return data;
};

export const syncWatchTime = async (
  request: SyncWatchRequest
): Promise<ScreenTimeResponse> => {
  const { data } = await apiClient.post<ScreenTimeResponse>(
    '/api/child/watch-time/sync',
    request
  );
  return data;
};

export const requestExtension = async (
  request: ExtendTimeRequest
): Promise<ScreenTimeResponse> => {
  const { data } = await apiClient.post<ScreenTimeResponse>(
    '/api/child/extension/request',
    request
  );
  return data;
};

export const updateChildAvatar = async (
  avatarEmoji: string,
  colorHex?: number
): Promise<{ success: boolean; child?: any; error?: string }> => {
  const { data } = await apiClient.put<{ success: boolean; child?: any; error?: string }>(
    '/api/child/avatar',
    { avatarEmoji, colorHex }
  );
  return data;
};

export const extendTime = async (
  request: ExtendTimeRequest
): Promise<ScreenTimeResponse> => {
  const { data } = await apiClient.post<ScreenTimeResponse>(
    '/api/parental/extend-time',
    request
  );
  return data;
};

// --- Content APIs ---
export const getApprovedContent = async (
  parentId?: string | null,
  category?: string | null,
  search?: string | null,
  channel?: string | null
): Promise<ApprovedContentResponse> => {
  const { data } = await apiClient.get<ApprovedContentResponse>(
    '/api/content/approved',
    { params: { parentId, category, search, channel } }
  );
  return data;
};

export const searchContent = async (
  query: string,
  parentId?: string | null
): Promise<ApprovedContentResponse> => {
  const { data } = await apiClient.get<ApprovedContentResponse>(
    '/api/content/search',
    { params: { q: query, parentId } }
  );
  return data;
};

export const addChannel = async (
  request: AddChannelRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    '/api/content/channel',
    request
  );
  return data;
};

export const removeChannel = async (
  id: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.delete<GenericActionResponse>(
    `/api/content/channel/${id}`
  );
  return data;
};

export const syncChannel = async (
  id: string
): Promise<{ success: boolean; addedCount: number; totalVideos: number; message: string }> => {
  const { data } = await apiClient.post<{ success: boolean; addedCount: number; totalVideos: number; message: string }>(
    `/api/content/channel/${id}/sync`
  );
  return data;
};

export const addPlaylist = async (
  request: AddPlaylistRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    '/api/content/playlist',
    request
  );
  return data;
};

export const removePlaylist = async (
  id: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.delete<GenericActionResponse>(
    `/api/content/playlist/${id}`
  );
  return data;
};

export const addVideo = async (
  request: AddVideoRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    '/api/content/video',
    request
  );
  return data;
};

export const removeVideo = async (
  id: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.delete<GenericActionResponse>(
    `/api/content/video/${id}`
  );
  return data;
};

// --- Parent Endpoints ---
export const verifyPin = async (
  request: PinVerifyRequest
): Promise<PinVerifyResponse> => {
  const { data } = await apiClient.post<PinVerifyResponse>(
    '/api/parent/verify-pin',
    request
  );
  return data;
};

export const getParentDashboard = async (): Promise<ParentDashboardResponse> => {
  const { data } = await apiClient.get<ParentDashboardResponse>(
    '/api/parent/dashboard'
  );
  return data;
};

export const getParentChildren = async (): Promise<ParentChildrenResponse> => {
  const { data } = await apiClient.get<ParentChildrenResponse>(
    '/api/parent/children'
  );
  return data;
};

export const checkChildUsername = async (
  username: string
): Promise<{ success: boolean; available: boolean; message: string }> => {
  const { data } = await apiClient.get<{
    success: boolean;
    available: boolean;
    message: string;
  }>('/api/parent/children/check-username', {
    params: { username },
  });
  return data;
};

export const createChild = async (
  request: CreateChildRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    '/api/parent/children',
    request
  );
  return data;
};

export const updateChild = async (
  childId: string,
  updates: Record<string, any>
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.put<GenericActionResponse>(
    `/api/parent/children/${childId}`,
    updates
  );
  return data;
};

export const resetChildPassword = async (
  childId: string,
  newPassword: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    `/api/parent/children/${childId}/reset-password`,
    { newPassword }
  );
  return data;
};

export const getChildPassword = async (
  childId: string
): Promise<ChildPasswordResponse> => {
  const { data } = await apiClient.get<ChildPasswordResponse>(
    `/api/parent/children/${childId}/password`
  );
  return data;
};

export const deleteChild = async (
  childId: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.delete<GenericActionResponse>(
    `/api/parent/children/${childId}`
  );
  return data;
};

export const updateDailyLimit = async (
  request: UpdateDailyLimitRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.put<GenericActionResponse>(
    '/api/parent/settings/daily-limit',
    request
  );
  return data;
};

export const updatePin = async (
  request: UpdatePinRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.put<GenericActionResponse>(
    '/api/parent/settings/pin',
    request
  );
  return data;
};

export const changeParentPassword = async (
  request: ChangePasswordRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    '/api/parent/change-password',
    request
  );
  return data;
};

export const updateParentProfile = async (
  request: UpdateParentProfileRequest
): Promise<ParentAuthResponse> => {
  const { data } = await apiClient.put<ParentAuthResponse>(
    '/api/parent/profile',
    request
  );
  return data;
};

// --- Admin Endpoints ---
export const getAdminDashboard = async (): Promise<AdminDashboardResponse> => {
  const { data } = await apiClient.get<AdminDashboardResponse>(
    '/api/admin/dashboard'
  );
  return data;
};

export const getAdminParents = async (
  search?: string | null
): Promise<AdminParentsResponse> => {
  const { data } = await apiClient.get<AdminParentsResponse>(
    '/api/admin/parents',
    { params: { search } }
  );
  return data;
};

export const createParentByAdmin = async (
  request: CreateParentByAdminRequest
): Promise<CreateParentByAdminResponse> => {
  const { data } = await apiClient.post<CreateParentByAdminResponse>(
    '/api/admin/parents',
    request
  );
  return data;
};

export const toggleParentStatus = async (
  parentId: string,
  status?: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.patch<GenericActionResponse>(
    `/api/admin/parents/${parentId}/toggle-status`,
    status ? { status } : {}
  );
  return data;
};

export const deleteAdminParent = async (
  parentId: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.delete<GenericActionResponse>(
    `/api/admin/parents/${parentId}`
  );
  return data;
};

export const getAdminChildren = async (
  search?: string | null
): Promise<AdminChildrenResponse> => {
  const { data } = await apiClient.get<AdminChildrenResponse>(
    '/api/admin/children',
    { params: { search } }
  );
  return data;
};

export const toggleChildStatus = async (
  childId: string,
  status?: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.patch<GenericActionResponse>(
    `/api/admin/children/${childId}/toggle-status`,
    status ? { status } : {}
  );
  return data;
};

export const deleteAdminChild = async (
  childId: string
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.delete<GenericActionResponse>(
    `/api/admin/children/${childId}`
  );
  return data;
};

export const getAdminContent = async (): Promise<AdminContentResponse> => {
  const { data } = await apiClient.get<AdminContentResponse>(
    '/api/admin/content'
  );
  return data;
};

export const moderateContent = async (
  request: ModerateContentRequest
): Promise<GenericActionResponse> => {
  const { data } = await apiClient.post<GenericActionResponse>(
    '/api/admin/content/moderate',
    request
  );
  return data;
};

/**
 * Export all API functions as a namespace object
 * Usage: `import { Api } from '../services/api'; Api.loginChild(...)`
 */
export const Api = {
  // Health
  getHealth,
  // Auth
  registerParent,
  loginParent,
  forgotPassword,
  resetPasswordWithOtp,
  loginChild,
  loginAdmin,
  logout,
  getCurrentUser,
  // Child
  getChildProfiles,
  getChildHome,
  getChildWatchTime,
  syncWatchTime,
  requestExtension,
  extendTime,
  updateChildAvatar,
  // Content
  getApprovedContent,
  searchContent,
  addChannel,
  removeChannel,
  syncChannel,
  addPlaylist,
  removePlaylist,
  addVideo,
  removeVideo,
  // Parent
  verifyPin,
  getParentDashboard,
  getParentChildren,
  checkChildUsername,
  createChild,
  updateChild,
  resetChildPassword,
  getChildPassword,
  deleteChild,
  updateDailyLimit,
  updatePin,
  changeParentPassword,
  updateParentProfile,
  // Admin
  getAdminDashboard,
  getAdminParents,
  createParentByAdmin,
  toggleParentStatus,
  deleteAdminParent,
  getAdminChildren,
  toggleChildStatus,
  deleteAdminChild,
  getAdminContent,
  moderateContent,
};