// src/utils/youtube.ts
import type { VideoItem } from '../types/models';

/**
 * YouTube URL & ID Utilities
 * Used by player + parent content approval dialogs
 */

/**
 * Extract 11-char YouTube video ID from a full URL or raw ID
 * Handles:
 *   - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   - https://youtu.be/dQw4w9WgXcQ
 *   - https://www.youtube.com/embed/dQw4w9WgXcQ
 *   - dQw4w9WgXcQ (raw)
 */
export const extractYoutubeId = (input: string): string | null => {
  const value = input.trim();
  if (!value) return null;

  // Raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  // URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
};

/**
 * Extract YouTube playlist ID from URL or raw ID
 * Handles:
 *   - https://www.youtube.com/playlist?list=PLxxxxxx
 *   - https://www.youtube.com/watch?v=xxx&list=PLxxxxxx
 *   - PLxxxxxx (raw)
 */
export const extractPlaylistId = (input: string): string | null => {
  const value = input.trim();
  if (!value) return null;

  // Raw playlist ID (typically starts with PL, UU, LL, FL, etc.)
  if (/^(PL|UU|LL|FL|RD|OL)[a-zA-Z0-9_-]+$/.test(value)) {
    return value;
  }

  const match = value.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

/**
 * Build YouTube thumbnail URL from video ID
 * Kotlin: "https://img.youtube.com/vi/$ytId/hqdefault.jpg"
 */
export const buildYoutubeThumbnail = (youtubeId: string): string => {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
};

export const getYoutubeThumbnailUrl = buildYoutubeThumbnail;

/**
 * Build the HTML for the YouTube IFrame embed player
 * Migrated 1:1 from Kotlin KidsVideoPlayerScreen.kt htmlContent
 * 
 * Uses youtube-nocookie.com for child-safe mode
 */
export const buildYoutubePlayerHtml = (
  youtubeId: string,
  options?: {
    captionsEnabled?: boolean;
    safeVolumeEnabled?: boolean;
    safeVolumeLimitPercent?: number;
    controls?: boolean;
  }
): string => {
  const controlsVal = options?.controls ? 1 : 0;
  const disablekbVal = options?.controls ? 0 : 1;
  const fsVal = options?.controls ? 1 : 0;
  const safeVolumeEnabled = options?.safeVolumeEnabled === true;
  const safeVolumeLimitPercent = Math.min(
    100,
    Math.max(1, Math.round(options?.safeVolumeLimitPercent ?? 60))
  );
  const captionsEnabled = options?.captionsEnabled === true;
  const ccLoadPolicyVal = captionsEnabled ? 1 : 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <!-- embedUrl: https://www.youtube-nocookie.com/embed/${youtubeId}?controls=${controlsVal}&disablekb=${disablekbVal}&fs=${fsVal}&cc_load_policy=${ccLoadPolicyVal} -->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #000000;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }
    #playerContainer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #000000;
      overflow: hidden;
      pointer-events: none;
    }
    #player, iframe {
      position: absolute;
      top: -55px;
      left: -4%;
      width: 108% !important;
      height: calc(100% + 110px) !important;
      border: 0;
      pointer-events: none !important;
      transform: none;
      transform-origin: center center;
    }
    body.mode-big #player, body.mode-big iframe {
      top: -55px;
      left: -4%;
      width: 108% !important;
      height: calc(100% + 110px) !important;
      transform: none;
      transform-origin: center center;
    }
    body.mode-small #player, body.mode-small iframe {
      top: -55px;
      left: -4%;
      width: 108% !important;
      height: calc(100% + 110px) !important;
      transform: none;
      transform-origin: center center;
    }
    .top-blackout-mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 24px;
      background-color: #000000;
      pointer-events: none;
      z-index: 999;
    }
    .bottom-blackout-mask {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 28px;
      background-color: #000000;
      pointer-events: none;
      z-index: 999;
    }
  </style>
</head>
<body class="mode-small">
  <div id="playerContainer">
    <iframe
      id="player"
      type="text/html"
      src="https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&playsinline=1&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=${ccLoadPolicyVal}&origin=https://www.youtube-nocookie.com&widget_referrer=https://www.youtube-nocookie.com"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
    <div class="top-blackout-mask"></div>
    <div class="bottom-blackout-mask"></div>
  </div>

  <script src="https://www.youtube.com/iframe_api"></script>
  <script>
    var player = null;
    var isPlayerReady = false;
    var safeVolumeEnabled = ${safeVolumeEnabled};
    var safeVolumeLimit = ${safeVolumeLimitPercent};
    var volumeBeforeSafeCap = null;
    var restoreVolume = null;
    var playbackState = { type: 'playback', currentTime: 0, duration: 0, isPlaying: false };

    function sendMessage(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    }

    function applySafeVolume() {
      if (player && typeof player.getVolume === 'function') {
        var currentVolume = player.getVolume();
        if (safeVolumeEnabled && currentVolume > safeVolumeLimit) {
          if (volumeBeforeSafeCap === null) volumeBeforeSafeCap = currentVolume;
          player.setVolume(safeVolumeLimit);
        } else if (!safeVolumeEnabled && volumeBeforeSafeCap !== null) {
          restoreVolume = volumeBeforeSafeCap;
          player.setVolume(volumeBeforeSafeCap);
          volumeBeforeSafeCap = null;
        }
      }
      var iframe = document.getElementById('player');
      if (iframe && iframe.contentWindow && (safeVolumeEnabled || restoreVolume !== null)) {
        var vol = safeVolumeEnabled ? safeVolumeLimit : restoreVolume;
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*');
        restoreVolume = null;
      }
    }

    function enforceSafeVolume() {
      if (safeVolumeEnabled) applySafeVolume();
    }

    function sendPlaybackState() {
      enforceSafeVolume();
      if (player && typeof player.getPlayerState === 'function') {
        var state = player.getPlayerState();
        var currentTime = player.getCurrentTime() || 0;
        var duration = player.getDuration() || 0;
        if (duration > 0 || currentTime > 0) {
          playbackState.type = 'playback';
          playbackState.currentTime = currentTime;
          playbackState.duration = duration;
          playbackState.isPlaying = state === YT.PlayerState.PLAYING;
          sendMessage(playbackState);
        }
      }
    }
    window.setInterval(sendPlaybackState, 250);

    // Direct YouTube IFrame postMessage listener: Works instantly without waiting for iframe_api
    window.addEventListener('message', function(event) {
      var data;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch (e) {
        return;
      }
      if (!data) return;

      if (data.event === 'onReady') {
        isPlayerReady = true;
        applySafeVolume();
        sendMessage({
          type: 'ready',
          duration: 0,
          isPlaying: true
        });
      } else if (data.event === 'infoDelivery' && data.info) {
        var info = data.info;
        if (typeof info.currentTime === 'number') {
          playbackState.currentTime = info.currentTime;
        }
        if (typeof info.duration === 'number' && info.duration > 0) {
          playbackState.duration = info.duration;
        }
        if (typeof info.playerState !== 'undefined') {
          playbackState.isPlaying = (info.playerState === 1);
          if (info.playerState === 0) {
            playbackState.type = 'ended';
            sendMessage(playbackState);
          } else if (info.playerState === 1 || info.playerState === 2) {
            playbackState.type = 'playback';
            sendMessage(playbackState);
          }
        }
      }
    });

    // YouTube Iframe API callback (if script loads successfully)
    function onYouTubeIframeAPIReady() {
      try {
        player = new YT.Player('player', {
          playerVars: {
            controls: ${controlsVal},
            disablekb: ${disablekbVal},
            fs: ${fsVal},
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            cc_load_policy: ${ccLoadPolicyVal},
            playsinline: 1,
            enablejsapi: 1
          },
          events: {
            onReady: function(event) {
              isPlayerReady = true;
              applySafeVolume();
              try { event.target.playVideo(); } catch (e) {}
              sendMessage({
                type: 'ready',
                duration: event.target.getDuration() || 0,
                isPlaying: event.target.getPlayerState() === YT.PlayerState.PLAYING
              });
            },
            onStateChange: function(event) {
              var state = event.data;
              if (state === YT.PlayerState.PLAYING) enforceSafeVolume();
              var isPlaying = (state === YT.PlayerState.PLAYING);
              var currentTime = (player && typeof player.getCurrentTime === 'function') ? player.getCurrentTime() : 0;
              var duration = (player && typeof player.getDuration === 'function') ? player.getDuration() : 0;

              if (state === YT.PlayerState.PLAYING) {
                playbackState.type = 'playback';
                playbackState.currentTime = currentTime;
                playbackState.duration = duration;
                playbackState.isPlaying = true;
                sendMessage(playbackState);
              } else if (state === YT.PlayerState.CUED || state === -1) {
                try { event.target.playVideo(); } catch (e) {}
              } else if (state === YT.PlayerState.PAUSED) {
                playbackState.type = 'playback';
                playbackState.currentTime = currentTime;
                playbackState.duration = duration;
                playbackState.isPlaying = false;
                sendMessage(playbackState);
              } else if (state === YT.PlayerState.BUFFERING) {
                sendMessage({
                  type: 'buffering',
                  currentTime: currentTime,
                  duration: duration,
                  isPlaying: false
                });
              } else if (state === YT.PlayerState.ENDED) {
                playbackState.type = 'ended';
                playbackState.currentTime = duration;
                playbackState.duration = duration;
                playbackState.isPlaying = false;
                sendMessage(playbackState);
              }
            },
            onError: function(event) {
              sendMessage({ type: 'error', code: event.data });
            }
          }
        });
      } catch (err) {
        console.warn('YT.Player init notice:', err);
      }
    }

    window.kiddoPlayerCommand = function(cmd, val) {
      var command = cmd;
      var iframe = document.getElementById('player');
      if (command === 'play') {
        enforceSafeVolume();
        if (player && typeof player.playVideo === 'function') {
          player.playVideo();
        } else if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
        }
      } else if (command === 'pause') {
        if (player && typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        } else if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
        }
      } else if (command === 'seek') {
        var seekTime = Math.max(0, Number(val) || 0);
        playbackState.currentTime = seekTime;
        if (player && typeof player.seekTo === 'function') {
          player.seekTo(seekTime, true);
        }
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekTime, true] }), '*');
        }
      } else if (command === 'setSpeed') {
        var spd = Number(val) || 1.0;
        if (player && typeof player.setPlaybackRate === 'function') {
          player.setPlaybackRate(spd);
        } else if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [spd] }), '*');
        }
      } else if (command === 'setResizeMode') {
        document.body.className = val === 'big' ? 'mode-big' : 'mode-small';
      } else if (command === 'safeVolume') {
        safeVolumeEnabled = val === true;
        applySafeVolume();
      } else if (command === 'captions') {
        if (val) {
          try {
            if (player) {
              player.loadModule('captions');
              player.setOption('captions', 'track', {'languageCode': 'en'});
            }
          } catch (e) {}
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'loadModule', args: ['captions'] }), '*');
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setOption', args: ['captions', 'track', {'languageCode': 'en'}] }), '*');
          }
        } else {
          try {
            if (player) {
              player.unloadModule('captions');
              player.setOption('captions', 'track', {});
            }
          } catch (e) {}
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unloadModule', args: ['captions'] }), '*');
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setOption', args: ['captions', 'track', {}] }), '*');
          }
        }
      }
    };
  </script>
</body>
</html>
  `.trim();
};

/**
 * Build rich HTML5 offline video player engine
 * Plays hardware-accelerated video for local downloaded files and direct media streams,
 * complete with synchronized timeupdate events, real audio, seek, and playback rate.
 * NO simulated canvas or fake timer increments are permitted.
 */
export const buildOfflinePlayerHtml = (
  video: VideoItem,
  localUri?: string,
  options?: {
    safeVolumeEnabled?: boolean;
    safeVolumeLimitPercent?: number;
    playbackSpeed?: number;
  }
): string => {
  const safeTitle = (video.title || 'Offline Video').replace(/"/g, '&quot;');
  const safeChannel = (video.channelTitle || 'KiddoTube Safe').replace(/"/g, '&quot;');
  const thumbUrl = video.thumbnailUrl || '';
  const resolvedSrc = (localUri || (video as any).localUri || (video as any).videoUrl || '').trim();
  const safeVolumeEnabled = options?.safeVolumeEnabled === true;
  const safeVolumeLimitPercent = Math.min(
    100,
    Math.max(1, Math.round(options?.safeVolumeLimitPercent ?? 60))
  );
  const initialSpeed = options?.playbackSpeed || 1.0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #000000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .viewport {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000000;
    }
    video {
      width: 100%; height: 100%;
      object-fit: contain;
      background: #000000;
    }
    body.mode-big video {
      object-fit: cover;
    }
    body.mode-small video {
      object-fit: contain;
    }
    .error-box {
      color: #FFFFFF;
      text-align: center;
      padding: 24px;
      max-width: 420px;
    }
    .error-title {
      font-size: 18px;
      font-weight: bold;
      color: #EF4444;
      margin-bottom: 8px;
    }
    .error-desc {
      font-size: 14px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .offline-badge {
      position: absolute;
      bottom: 12px; left: 12px;
      background: rgba(16, 185, 129, 0.9);
      color: #FFFFFF;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      pointer-events: none;
      z-index: 20;
    }
  </style>
</head>
<body class="mode-small">
  <div class="viewport">
    ${
      resolvedSrc
        ? `
    <video
      id="offlineVideo"
      src="${resolvedSrc}"
      poster="${thumbUrl}"
      playsinline
      webkit-playsinline
      autoplay
      preload="auto"
    ></video>
    <div class="offline-badge">● Offline Local Playback</div>
    `
        : `
    <div class="error-box">
      <div class="error-title">Offline Video Not Found</div>
      <div class="error-desc">This video has not been downloaded to your device yet. Please connect to Wi-Fi to download and watch offline.</div>
    </div>
    `
    }
  </div>

  <script>
    (function() {
      var video = document.getElementById('offlineVideo');
      var safeVolumeEnabled = ${safeVolumeEnabled};
      var safeVolumeLimit = ${safeVolumeLimitPercent / 100};
      var volumeBeforeSafeCap = null;
      var initialSpeed = ${initialSpeed};

      function sendMessage(msg) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }

      if (!video) {
        sendMessage({ type: 'error', message: 'No offline video file found on device' });
        return;
      }

      video.playbackRate = initialSpeed;

      function applySafeVolume() {
        if (safeVolumeEnabled && video.volume > safeVolumeLimit) {
          if (volumeBeforeSafeCap === null) volumeBeforeSafeCap = video.volume;
          video.volume = safeVolumeLimit;
        } else if (!safeVolumeEnabled && volumeBeforeSafeCap !== null) {
          video.volume = volumeBeforeSafeCap;
          volumeBeforeSafeCap = null;
        }
      }
      applySafeVolume();
      video.addEventListener('volumechange', function() {
        applySafeVolume();
      });

      video.addEventListener('loadedmetadata', function() {
        sendMessage({
          type: 'ready',
          duration: video.duration || 0,
          isPlaying: !video.paused
        });
      });

      // Real timeupdate: fires ONLY when actual video frames advance!
      video.addEventListener('timeupdate', function() {
        sendMessage({
          type: 'playback',
          currentTime: video.currentTime,
          duration: video.duration || 0,
          isPlaying: !video.paused
        });
      });

      video.addEventListener('play', function() {
        sendMessage({
          type: 'playback',
          currentTime: video.currentTime,
          duration: video.duration || 0,
          isPlaying: true
        });
      });

      video.addEventListener('pause', function() {
        sendMessage({
          type: 'playback',
          currentTime: video.currentTime,
          duration: video.duration || 0,
          isPlaying: false
        });
      });

      video.addEventListener('waiting', function() {
        sendMessage({
          type: 'buffering',
          currentTime: video.currentTime,
          duration: video.duration || 0,
          isPlaying: false
        });
      });

      video.addEventListener('ended', function() {
        sendMessage({
          type: 'ended',
          currentTime: video.duration,
          duration: video.duration,
          isPlaying: false
        });
      });

      video.addEventListener('error', function() {
        sendMessage({
          type: 'error',
          message: video.error ? video.error.message : 'Media playback decode error'
        });
      });

      // Autoplay
      video.play().catch(function(e) {
        console.warn('Autoplay restricted, awaiting tap', e);
      });

      window.kiddoPlayerCommand = function(cmd, val) {
        if (!video) return;
        if (cmd === 'play') {
          applySafeVolume();
          video.play().catch(function() {});
        } else if (cmd === 'pause') {
          video.pause();
        } else if (cmd === 'seek') {
          video.currentTime = Number(val) || 0;
        } else if (cmd === 'setSpeed') {
          video.playbackRate = Number(val) || 1.0;
        } else if (cmd === 'setResizeMode') {
          document.body.className = val === 'big' ? 'mode-big' : 'mode-small';
        } else if (cmd === 'safeVolume') {
          safeVolumeEnabled = val === true;
          applySafeVolume();
        }
      };
    })();
  </script>
</body>
</html>
  `.trim();
};
