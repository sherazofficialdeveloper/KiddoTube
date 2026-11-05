// src/types/api.ts

/**
 * KidsStream API Models
 * Migrated 1:1 from Kotlin KidsApiModels.kt
 * All DTOs match backend contracts exactly
 */

// --- Health ---
export interface HealthResponse {
  status?: string;
  service?: string;
  version?: string;
}

// --- Child Models ---
export interface ChildProfileDto {
  id: string;
  name: string;
  avatarEmoji: string;
  colorHex: number;
  dailyLimitMinutes: number;
  ageGroup: number;
}

export interface ChildProfilesResponse {
  success: boolean;
  count: number;
  profiles: ChildProfileDto[];
}

export interface ChildLoginRequest {
  username?: string | null;
  password?: string | null;
  profileId?: string | null;
}

export interface ChildLoginResponse {
  success: boolean;
  token?: string | null;
  child?: ChildProfileDto | null;
  data?: ChildProfileDto | null;
  message?: string | null;
  error?: string | null;
}

// --- Media Content Models ---
export interface VideoItemDto {
  id: string;
  parentId?: string | null;
  parentName?: string;
  allowedChildNames?: string[];
  sourceType?: 'DIRECT' | 'CHANNEL' | 'PLAYLIST';
  sourceName?: string;
  youtubeId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationText: string;
  category: string;
  description: string;
  status: string;
  isBlocked: boolean;
  createdAt?: string;
  publishedAt?: string;
  childIds?: string[];
}

export interface ChannelItemDto {
  id: string;
  parentId?: string | null;
  parentName?: string;
  allowedChildNames?: string[];
  createdAt?: string;
  channelId?: string | null;
  title: string;
  avatarUrl: string;
  videoCount: number;
  colorAccentHex: number;
  description: string;
  status: string;
  isBlocked: boolean;
  childIds?: string[];
}

export interface PlaylistItemDto {
  id: string;
  parentId?: string | null;
  parentName?: string;
  allowedChildNames?: string[];
  createdAt?: string;
  playlistId?: string | null;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  videoCount: number;
  videoIds: string[];
  status: string;
  isBlocked: boolean;
  childIds?: string[];
}

export interface ApprovedContentResponse {
  success: boolean;
  count: number;
  videos: VideoItemDto[];
  channels: ChannelItemDto[];
  playlists: PlaylistItemDto[];
}

export interface SearchContentResponse {
  success: boolean;
  videos: VideoItemDto[];
  channels: ChannelItemDto[];
  playlists: PlaylistItemDto[];
}

// --- PIN & Screen-time Models ---
export interface PinVerifyRequest {
  parentId: string;
  pin: string;
}

export interface PinVerifyResponse {
  success: boolean;
  message?: string | null;
  overrideToken?: string | null;
  error?: string | null;
  lockoutSecondsRemaining?: number | null;
  attemptsLeft?: number | null;
  timeUsedMinutes?: number | null;
  dailyLimitMinutes?: number | null;
}

export interface ExtendTimeRequest {
  childId: string;
  pin: string;
  extensionMinutes: number;
}

export interface SyncWatchRequest {
  childId: string;
  secondsIncrement: number;
}

export interface ScreenTimeSessionDto {
  childId: string;
  date: string;
  dailyLimitMinutes: number;
  tempExtensionMinutes: number;
  totalAllowedMinutes: number;
  secondsWatched: number;
  minutesWatched: number;
  remainingSeconds: number;
  remainingMinutes: number;
  isTimeUp: boolean;
}

export interface ScreenTimeResponse {
  success: boolean;
  message?: string | null;
  session?: ScreenTimeSessionDto | null;
}

// --- Parent Authentication & Panel Models ---
export interface ParentLoginRequest {
  username?: string | null;
  email?: string | null;
  password: string;
}

export interface ParentRegisterRequest {
  username: string;
  email: string;
  password: string;
  pin?: string;
}

export interface ParentAccountDto {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  dailyLimitMinutes: number;
  status: string;
}

export interface UpdateParentProfileRequest {
  username: string;
  displayName: string;
  email: string;
}

export interface ParentAuthResponse {
  success: boolean;
  data?: ParentAccountDto | null;
  token?: string | null;
  role?: string | null;
  message?: string | null;
  error?: string | null;
}

export interface CurrentUserResponse {
  success: boolean;
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
    parentId?: string | null;
    childId?: string | null;
    details?: Record<string, unknown> | null;
  } | null;
}

export interface ParentStatsDto {
  totalChildren: number;
  dailyLimitMinutes: number;
  todayTotalWatchedMinutes: number;
  totalApprovedChannels: number;
  totalApprovedPlaylists: number;
  totalApprovedVideos: number;
}

export interface ParentDashboardDataDto {
  parent?: ParentAccountDto | null;
  stats: ParentStatsDto;
}

export interface ParentDashboardResponse {
  success: boolean;
  data?: ParentDashboardDataDto | null;
  error?: string | null;
}

export interface ChildDetailDto {
  id: string;
  parentId?: string | null;
  username: string;
  displayName: string;
  avatarEmoji: string;
  colorHex: number;
  ageGroup?: number | null;
  status: string;
  dailyLimitMinutes: number;
  minutesWatchedToday: number;
  secondsWatchedToday: number;
  tempExtensionMinutes: number;
}

export interface ParentChildrenResponse {
  success: boolean;
  count: number;
  data: ChildDetailDto[];
  error?: string | null;
}

export interface CreateChildRequest {
  username: string;
  displayName?: string | null;
  password?: string | null;
  avatarEmoji?: string | null;
  colorHex?: number | null;
  ageGroup?: number | null;
}

export interface UpdateDailyLimitRequest {
  dailyLimitMinutes: number;
}

export interface UpdatePinRequest {
  currentPin?: string | null;
  newPin: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AddChannelRequest {
  title: string;
  channelUrlOrId?: string | null;
  channelId?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  colorAccentHex?: number | null;
  category?: string | null;
  childIds?: string[];
}

export interface AddPlaylistRequest {
  title: string;
  playlistUrlOrId?: string | null;
  channelTitle?: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  childIds?: string[];
}

export interface AddVideoRequest {
  title: string;
  channelTitle?: string | null;
  youtubeUrlOrId: string;
  category?: string | null;
  durationText?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  childIds?: string[];
}

export interface GenericActionResponse {
  success: boolean;
  message?: string | null;
  error?: string | null;
}

export interface ChildPasswordResponse {
  success: boolean;
  data?: { password: string } | null;
  error?: string | null;
}

// --- Admin Models ---
export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminAccountDto {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  role: string;
}

export interface AdminAuthResponse {
  success: boolean;
  data?: AdminAccountDto | null;
  token?: string | null;
  role?: string | null;
  message?: string | null;
  error?: string | null;
}

export interface AdminStatsDto {
  totalUsers?: number;
  totalParents: number;
  activeParents: number;
  disabledParents: number;
  totalChildren: number;
  activeChildren: number;
  disabledChildren: number;
  totalChannels: number;
  totalPlaylists: number;
  totalVideos: number;
  systemStatus: string;
  uptimeSeconds: number;
  nodeVersion: string;
  databaseType: string;
}

export interface AdminDashboardResponse {
  success: boolean;
  data?: AdminStatsDto | null;
  error?: string | null;
}

export interface AdminParentItemDto {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  dailyLimitMinutes: number;
  status: string;
  childrenCount: number;
  createdAt?: string | null;
  publishedAt?: string | null;
}

export interface AdminParentsResponse {
  success: boolean;
  count: number;
  data: AdminParentItemDto[];
  error?: string | null;
}

export interface AdminChildItemDto {
  id: string;
  parentId: string;
  parentUsername: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  status: string;
  createdAt?: string | null;
}

export interface AdminChildrenResponse {
  success: boolean;
  count: number;
  data: AdminChildItemDto[];
  error?: string | null;
}

export interface AdminContentDataDto {
  channels: ChannelItemDto[];
  playlists: PlaylistItemDto[];
  videos: VideoItemDto[];
}

export interface AdminContentResponse {
  success: boolean;
  data?: AdminContentDataDto | null;
  error?: string | null;
}

export interface ModerateContentRequest {
  type: 'channel' | 'playlist' | 'video';
  id: string;
  action: 'BLOCK' | 'REMOVE';
}

export interface CreateParentByAdminRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  dailyLimitMinutes?: number;
  pin?: string;
}

export interface CreateParentByAdminResponse {
  success: boolean;
  data?: AdminParentItemDto | null;
  message?: string;
  error?: string | null;
}
