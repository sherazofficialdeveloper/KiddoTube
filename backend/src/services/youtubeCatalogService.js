const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const REQUEST_TIMEOUT_MS = 12000;

function getApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw {
      statusCode: 503,
      message: 'YouTube import is not configured. Set YOUTUBE_API_KEY on the backend.'
    };
  }
  return apiKey;
}

async function request(resource, params) {
  const url = new URL(`${API_BASE_URL}/${resource}`);
  url.search = new URLSearchParams({
    ...params,
    key: getApiKey()
  }).toString();

  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw {
      statusCode: 502,
      message: 'YouTube request timed out or could not be reached.'
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw {
      statusCode: 502,
      message: 'YouTube returned an unreadable response.'
    };
  }
  if (!response.ok) {
    throw {
      statusCode: 502,
      message: `YouTube returned an error (${response.status}). Check the link, API key, and YouTube Data API configuration.`
    };
  }
  return payload;
}

function thumbnailFrom(thumbnails = {}) {
  return thumbnails.maxres?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    '';
}

function formatDuration(duration = '') {
  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
  );
  if (!match) return '00:00';
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const totalMinutes = hours * 60 + minutes;
  return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function getVideoMetadata(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];
  const results = [];
  const CHUNK_SIZE = 50;
  const chunks = [];

  for (let i = 0; i < videoIds.length; i += CHUNK_SIZE) {
    chunks.push(videoIds.slice(i, i + CHUNK_SIZE));
  }

  // Fetch chunks in parallel batches of 4 requests
  const BATCH_SIZE = 4;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const currentBatch = chunks.slice(i, i + BATCH_SIZE);
    const batchData = await Promise.all(
      currentBatch.map((chunk) =>
        request('videos', {
          part: 'snippet,contentDetails',
          id: chunk.join(',')
        })
      )
    );

    for (const data of batchData) {
      if (data && data.items) {
        for (const item of data.items) {
          results.push({
            youtubeId: item.id,
            title: item.snippet?.title || 'YouTube Video',
            channelTitle: item.snippet?.channelTitle || 'Approved Channel',
            thumbnailUrl: thumbnailFrom(item.snippet?.thumbnails),
            durationText: formatDuration(item.contentDetails?.duration),
            description: item.snippet?.description || ''
          });
        }
      }
    }
  }

  return results;
}

async function getChannel(identifier) {
  const isChannelId = /^UC[a-zA-Z0-9_-]{22}$/.test(identifier);
  let data = await request('channels', {
    part: 'snippet,contentDetails,statistics',
    [isChannelId ? 'id' : 'forHandle']: identifier.replace(/^@/, '')
  });
  let channel = data.items[0];
  if (!channel && !isChannelId) {
    const search = await request('search', {
      part: 'snippet',
      type: 'channel',
      q: identifier
    });
    const channelId = search.items[0]?.id?.channelId;
    if (channelId) {
      data = await request('channels', {
        part: 'snippet,contentDetails,statistics',
        id: channelId
      });
      channel = data.items[0];
    }
  }
  if (!channel) {
    throw { statusCode: 404, message: 'YouTube channel was not found.' };
  }
  return channel;
}

async function getPlaylist(playlistId) {
  const data = await request('playlists', {
    part: 'snippet,contentDetails',
    id: playlistId
  });
  const playlist = data.items[0];
  if (!playlist) {
    throw { statusCode: 404, message: 'YouTube playlist was not found.' };
  }
  return playlist;
}

async function getPlaylistVideoIds(playlistId, maxVideos = 2500) {
  if (!playlistId) return [];
  const videoIds = [];
  const seen = new Set();
  let pageToken = undefined;
  let pageCount = 0;
  const maxPages = Math.ceil(maxVideos / 50) + 10;

  do {
    const params = {
      part: 'contentDetails',
      playlistId,
      maxResults: '50'
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    const data = await request('playlistItems', params);
    const items = data.items || [];
    if (items.length === 0) break;

    for (const item of items) {
      const vid = item.contentDetails?.videoId;
      if (vid && !seen.has(vid)) {
        seen.add(vid);
        videoIds.push(vid);
      }
    }
    pageToken = data.nextPageToken;
    pageCount++;
  } while (pageToken && videoIds.length < maxVideos && pageCount < maxPages);

  return videoIds;
}

async function getChannelVideos(uploadsPlaylistId, maxVideos = 2500) {
  if (!uploadsPlaylistId) return [];
  return getPlaylistVideoIds(uploadsPlaylistId, maxVideos);
}

module.exports = {
  getApiKey,
  getChannel,
  getPlaylist,
  getPlaylistVideoIds,
  getChannelVideos,
  getVideoMetadata,
  thumbnailFrom,
  formatDuration
};
