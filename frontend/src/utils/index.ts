// src/utils/index.ts

export {
  formatRemainingMinutes,
  formatCompactMinutes,
  formatCountdown,
  formatUsageText,
  formatTodayWatched,
  formatVideoDuration,
  computeUsedMinutes,
  computeProgress,
} from './formatTime';

export {
  extractYoutubeId,
  extractPlaylistId,
  buildYoutubeThumbnail,
  buildYoutubePlayerHtml,
} from './youtube';

export { hexLongToColor, getInitial, withAlpha } from './color';
export { copyToClipboard } from './clipboard';