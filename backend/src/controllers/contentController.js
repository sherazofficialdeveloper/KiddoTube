const contentService = require('../services/contentService');
const db = require('../models/db');
const fs = require('node:fs');

async function resolveParentId(req) {
  if (req.user) {
    if (req.user.role === 'ADMIN' && req.query.parentId) {
      return req.query.parentId;
    }
    return req.user.parentId || req.user.id;
  }
  if (req.query.parentId) {
    return req.query.parentId;
  }
  try {
    const dbInstance = await db.getDb();
    const latestVideo = await dbInstance.collection('videos').findOne(
      { status: 'APPROVED' },
      { sort: { createdAt: -1 } }
    );
    if (latestVideo) return latestVideo.parentId;
  } catch {}
  return null;
}

async function getApprovedVideos(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication session required to access approved content'
      });
    }

    const { category, search, channel } = req.query;
    const childId = req.user?.role === 'CHILD'
      ? req.user.childId || req.user.id
      : null;
    const result = await contentService.getApprovedContent(parentId, {
      category,
      search,
      channel,
      childId
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getVideoById(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication session required to access video'
      });
    }

    const { id } = req.params;
    const childId = req.user?.role === 'CHILD'
      ? req.user.childId || req.user.id
      : null;
    const video = await contentService.getVideoById(parentId, id, childId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found, removed, or not approved by parent'
      });
    }

    return res.status(200).json({ success: true, data: video });
  } catch (err) {
    next(err);
  }
}

async function searchContent(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication session required to search content'
      });
    }

    const q = req.query.q || req.query.query || '';
    const result = await contentService.getApprovedContent(parentId, { search: q });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function addChannel(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({ success: false, error: 'Parent authentication required' });
    }
    const channel = await contentService.addChannel(parentId, req.body);
    return res.status(201).json({ success: true, data: channel, message: 'Channel approved.' });
  } catch (err) {
    next(err);
  }
}

async function removeChannel(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({ success: false, error: 'Parent authentication required' });
    }
    const { id } = req.params;
    const result = await contentService.removeChannel(parentId, id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function syncChannelHandler(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { id } = req.params;
    const result = await contentService.syncChannel(parentId, id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function addPlaylist(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({ success: false, error: 'Parent authentication required' });
    }
    const playlist = await contentService.addPlaylist(parentId, req.body);
    return res.status(201).json({ success: true, data: playlist, message: 'Playlist approved.' });
  } catch (err) {
    next(err);
  }
}

async function removePlaylist(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({ success: false, error: 'Parent authentication required' });
    }
    const { id } = req.params;
    const result = await contentService.removePlaylist(parentId, id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function addVideo(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({ success: false, error: 'Parent authentication required' });
    }
    const video = await contentService.addVideo(parentId, req.body);
    return res.status(201).json({ success: true, data: video, message: 'Video approved.' });
  } catch (err) {
    next(err);
  }
}

async function removeVideo(req, res, next) {
  try {
    const parentId = await resolveParentId(req);
    if (!parentId) {
      return res.status(401).json({ success: false, error: 'Parent authentication required' });
    }
    const { id } = req.params;
    const result = await contentService.removeVideo(parentId, id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

let ytdlInstance = null;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeYoutubeCookie(value) {
  const text = value?.trim()?.replace(/\\r\\n|\\n|\\r|\\t/g, (token) => {
    if (token === '\\t') return '\t';
    if (token === '\\n') return '\n';
    return '\r';
  });
  if (!text) return undefined;
  if (text.includes('\t')) return text;

  // Some hosting panels flatten Netscape cookies.txt into one line and
  // remove the tabs/newlines required by ytdl-core's Netscape parser.
  const cookies = [];
  const flattenedLine =
    /(?:^|\s)(?:#HttpOnly_)?\.?youtube\.com\s+TRUE\s+\S+\s+TRUE\s+\d+\s+([^\s]+)\s+([^\s;]+)/g;
  let match;
  while ((match = flattenedLine.exec(text)) !== null) {
    cookies.push(`${match[1]}=${match[2]}`);
  }
  if (cookies.length > 0) return cookies.join('; ');

  // Also accept a Cookie header embedded in copied panel text.
  const knownCookieNames =
    /(?:^|[;\s])((?:SAPISID|APISID|SSID|HSID|SID|LSID|PSID|PSSID|YSC|VISITOR_INFO1_LIVE|__Secure-[^=\s;]+))=([^;\s]+)/g;
  while ((match = knownCookieNames.exec(text)) !== null) {
    cookies.push(`${match[1]}=${match[2]}`);
  }
  return cookies.length > 0 ? cookies.join('; ') : undefined;
}

function getYtdl() {
  if (!ytdlInstance) {
    const ytdl = require('@distube/ytdl-core');
    let rawCookie = process.env.YT_COOKIE;
    const cookieFile = process.env.YT_COOKIE_FILE?.trim();
    if (!rawCookie && cookieFile) {
      try {
        rawCookie = fs.readFileSync(cookieFile, 'utf8');
      } catch (error) {
        console.warn(`[YouTube] Unable to read YT_COOKIE_FILE: ${error.message}`);
      }
    }
    const cookie = normalizeYoutubeCookie(rawCookie);
    const hasSignedInCookie =
      typeof cookie === 'string' &&
      /(?:^|;\s*)(?:SAPISID|__Secure-3PAPISID)=/i.test(cookie);
    ytdlInstance = new ytdl.Ytdl({
      clients: [
        ytdl.Client.WebCreator,
        ytdl.Client.WebEmbedded,
        ytdl.Client.Tv,
        ytdl.Client.Mweb
      ],
      ...(hasSignedInCookie ? { cookie } : {})
    });
    console.info(
      `[YouTube] Downloader initialized with ${
        hasSignedInCookie ? 'configured authentication cookie' : 'no valid authentication cookie'
      }`
    );
  }
  return ytdlInstance;
}

async function streamVideo(req, res) {
  const { youtubeId } = req.params;
  if (!youtubeId || typeof youtubeId !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing youtubeId' });
  }

  try {
    const client = getYtdl();
    let info;
    let lastInfoError;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        info = await client.getInfo(youtubeId);
        break;
      } catch (error) {
        lastInfoError = error;
        if (attempt < 4) {
          await wait(Math.min(4000, 750 * (attempt + 1)));
        }
      }
    }
    if (!info) {
      throw lastInfoError || new Error('Unable to resolve YouTube video stream');
    }

    // Prioritize format 18 (360p MP4 muxed with video and audio) or any muxed audio+video format
    const chosenFormat =
      info.formats.find((f) => f.itag === 18 && f.hasAudio && f.hasVideo) ||
      info.formats.find((f) => f.itag === 18) ||
      info.formats.find((f) => f.hasVideo && f.hasAudio && f.container === 'mp4') ||
      info.formats.find((f) => f.hasVideo && f.hasAudio) ||
      info.formats.find((f) => f.container === 'mp4');

    if (!chosenFormat) {
      console.warn(`[streamVideo] No playable format found for ${youtubeId}`);
      return res.status(404).json({ success: false, error: 'No stream format found for video' });
    }

    if (!chosenFormat.url) {
      return res.status(502).json({
        success: false,
        error: 'YouTube returned a format without a downloadable URL'
      });
    }

    // Do not proxy the complete media stream through Hostinger. Long-running
    // proxied streams can be terminated by the hosting layer and leave the
    // native downloader with a partial file. The signed CDN URL is freshly
    // resolved for every request, so retries and Range requests get a fresh
    // upstream URL.
    res.setHeader('Content-Disposition', `attachment; filename="${youtubeId}.mp4"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(307, chosenFormat.url);
  } catch (err) {
    console.warn(`[ytdl stream exception for ${youtubeId}]:`, err.message);
    if (!res.headersSent) {
      const errorText = String(err?.message || '');
      const isBotCheck =
        err?.code === 'BOT_CHECK' ||
        /sign in to confirm.*not a bot|confirm you.?re not a bot/i.test(errorText);
      res.status(isBotCheck ? 503 : 502).json({
        success: false,
        code: isBotCheck ? 'YOUTUBE_BOT_CHECK' : 'YOUTUBE_STREAM_UNAVAILABLE',
        error: isBotCheck
          ? 'YouTube rejected this server as automated traffic. Configure a valid YT_COOKIE on the backend or use an official YouTube playback path.'
          : 'YouTube did not provide a downloadable stream. Please retry later.'
      });
    }
  }
}

module.exports = {
  getApprovedVideos,
  getVideoById,
  searchContent,
  addChannel,
  removeChannel,
  syncChannel: syncChannelHandler,
  addPlaylist,
  removePlaylist,
  addVideo,
  removeVideo,
  streamVideo,
};
