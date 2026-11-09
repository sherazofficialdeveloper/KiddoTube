const db = require('../models/db');
const { CONTENT_STATUS } = require('../constants/roles');
const { extractYouTubeVideoId, extractYouTubePlaylistId, extractYouTubeChannelIdentifier } = require('../validators/inputValidators');
const youtubeCatalog = require('./youtubeCatalogService');

async function normalizeChildIds(parentId, childIds) {
  if (childIds === undefined || childIds === null || !Array.isArray(childIds)) return [];
  const normalizedIds = Array.from(new Set(childIds.map(String)));
  if (normalizedIds.length === 0) return [];

  const children = await db.findChildrenByParentId(parentId);
  const validChildIds = new Set(children.map((child) => child.id));
  if (normalizedIds.some((id) => !validChildIds.has(id))) {
    throw { statusCode: 400, message: 'Selected child profile is not part of this parent account.' };
  }
  return normalizedIds;
}

async function saveApprovedVideos(parentId, metadata, channelTitle, category, childIds) {
  const existingVideos = await db.getVideos(parentId);
  const byYoutubeId = new Map(existingVideos.map((video) => [video.youtubeId, video]));
  const toInsert = [];

  for (const video of metadata) {
    const existing = byYoutubeId.get(video.youtubeId);
    if (existing) {
      const existingAudience = existing.childIds || [];
      const mergedAudience = existingAudience.length === 0 || childIds.length === 0
        ? []
        : Array.from(new Set([...existingAudience, ...childIds]));
      if (JSON.stringify(existingAudience) !== JSON.stringify(mergedAudience)) {
        await db.updateVideo(existing.id, { childIds: mergedAudience });
        existing.childIds = mergedAudience;
      }
      continue;
    }
    toInsert.push({
      id: `vid_${Date.now()}_${video.youtubeId}`,
      parentId,
      youtubeId: video.youtubeId,
      title: video.title,
      channelTitle: channelTitle || video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      durationText: video.durationText,
      category: (category || 'LEARNING').toUpperCase(),
      childIds,
      description: video.description,
      status: CONTENT_STATUS.APPROVED,
      createdAt: new Date().toISOString()
    });
  }

  if (toInsert.length > 0) {
    const savedList = await db.addVideos(toInsert);
    for (const saved of savedList) {
      byYoutubeId.set(saved.youtubeId, saved);
    }
  }

  return byYoutubeId;
}

async function getApprovedContent(parentId, { category, search, channel, childId }) {
  let videos = await db.getVideos(parentId, CONTENT_STATUS.APPROVED);
  let channels = await db.getChannels(parentId, CONTENT_STATUS.APPROVED);
  let playlists = await db.getPlaylists(parentId, CONTENT_STATUS.APPROVED);

  if (childId) {
    const isVisibleToChild = (item) => !item.childIds || item.childIds.length === 0 ||
      item.childIds.includes(String(childId));
    videos = videos.filter(isVisibleToChild);
    channels = channels.filter(isVisibleToChild);
    playlists = playlists.filter(isVisibleToChild);
  }

  if (category && category !== 'ALL') {
    videos = videos.filter(v => v.category === category.toUpperCase());
  }

  if (channel) {
    videos = videos.filter(v => v.channelTitle.toLowerCase() === channel.toLowerCase());
  }

  if (search) {
    const q = search.trim().toLowerCase();
    videos = videos.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.channelTitle.toLowerCase().includes(q) ||
      (v.description && v.description.toLowerCase().includes(q))
    );
    channels = channels.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
    playlists = playlists.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.channelTitle.toLowerCase().includes(q)
    );
  }

  return {
    count: videos.length,
    videos,
    channels,
    playlists
  };
}

async function getVideoById(parentId, id, childId) {
  const video = await db.findVideoById(id);
  if (!video) return null;
  if (video.parentId !== parentId) return null;
  if (video.status !== CONTENT_STATUS.APPROVED) return null;
  if (childId && video.childIds?.length > 0 && !video.childIds.includes(String(childId))) return null;
  return video;
}

async function addChannel(parentId, { title, channelId, channelUrlOrId, avatarUrl, description, colorAccentHex, category, childIds: requestedChildIds }) {
  const childIds = await normalizeChildIds(parentId, requestedChildIds);
  const channelIdentifier = extractYouTubeChannelIdentifier(channelUrlOrId || channelId);
  const cleanChannelId = channelIdentifier;
  if (!cleanChannelId) {
    throw { statusCode: 400, message: 'A valid YouTube channel URL, handle, or ID is required' };
  }

  const youtubeChannel = await youtubeCatalog.getChannel(cleanChannelId);
  const channelTitle = title?.trim() || youtubeChannel.snippet.title;
  const videoIds = await youtubeCatalog.getChannelVideos(
    youtubeChannel.contentDetails.relatedPlaylists.uploads
  );
  const videoMetadata = await youtubeCatalog.getVideoMetadata(videoIds);
  await saveApprovedVideos(parentId, videoMetadata, channelTitle, category || 'SHOWS', childIds);

  const id = `ch_${Date.now()}`;

  const newChannel = await db.addChannel({
    id,
    parentId,
    channelId: youtubeChannel.id,
    title: channelTitle,
    avatarUrl: avatarUrl || youtubeCatalog.thumbnailFrom(youtubeChannel.snippet.thumbnails),
    videoCount: videoMetadata.length,
    colorAccentHex: colorAccentHex || 0xFF00A6FB,
    childIds,
    description: description || youtubeChannel.snippet.description || 'Parent approved channel',
    category: (category || 'SHOWS').toUpperCase(),
    status: CONTENT_STATUS.APPROVED,
    createdAt: new Date().toISOString()
  });

  return newChannel;
}

async function removeChannel(parentId, id) {
  const channel = await db.findChannelById(id);
  if (!channel || channel.parentId !== parentId) {
    throw { statusCode: 404, message: 'Channel not found' };
  }

  await db.deleteChannel(id);
  // Also remove videos associated with this channel
  const videos = await db.getVideos(parentId);
  for (const v of videos) {
    if (v.channelTitle && channel.title && v.channelTitle.toLowerCase() === channel.title.toLowerCase()) {
      await db.deleteVideo(v.id);
    }
  }

  return { success: true, message: `Channel "${channel.title}" and associated videos removed` };
}

async function syncChannel(parentId, idOrChannelId) {
  let channel = await db.findChannelById(idOrChannelId);
  if (!channel) {
    const dbInstance = await db.getDb();
    channel = await dbInstance.collection('channels').findOne({ parentId, channelId: idOrChannelId });
  }
  if (!channel || channel.parentId !== parentId) {
    throw { statusCode: 404, message: 'Channel not found' };
  }

  const youtubeChannel = await youtubeCatalog.getChannel(channel.channelId);
  const uploadsPlaylist = youtubeChannel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylist) {
    return { success: true, addedCount: 0, message: 'Channel uploads playlist not found' };
  }

  const videoIds = await youtubeCatalog.getChannelVideos(uploadsPlaylist);
  const existingVideos = await db.getVideos(parentId);
  const existingSet = new Set(existingVideos.map((v) => v.youtubeId));
  const newVideoIds = videoIds.filter((vid) => !existingSet.has(vid));

  let addedCount = 0;
  if (newVideoIds.length > 0) {
    const newMetadata = await youtubeCatalog.getVideoMetadata(newVideoIds);
    await saveApprovedVideos(parentId, newMetadata, channel.title, channel.category || 'SHOWS', channel.childIds || []);
    addedCount = newMetadata.length;
    const dbInstance = await db.getDb();
    await dbInstance.collection('channels').updateOne(
      { id: channel.id },
      { $inc: { videoCount: addedCount } }
    );
  }

  return {
    success: true,
    addedCount,
    totalVideos: (channel.videoCount || 0) + addedCount,
    message: addedCount > 0 ? `Synced ${addedCount} new videos from ${channel.title}` : `Channel "${channel.title}" is up to date`
  };
}

async function addPlaylist(parentId, { title, playlistUrlOrId, channelTitle, thumbnailUrl, videoIds = [], category, childIds: requestedChildIds }) {
  const childIds = await normalizeChildIds(parentId, requestedChildIds);
  const cleanPlaylistId = extractYouTubePlaylistId(playlistUrlOrId);
  if (!cleanPlaylistId) {
    throw { statusCode: 400, message: 'A valid YouTube playlist URL or ID is required' };
  }
  const youtubePlaylist = await youtubeCatalog.getPlaylist(cleanPlaylistId);
  const playlistVideoIds = await youtubeCatalog.getPlaylistVideoIds(cleanPlaylistId);
  const videoMetadata = await youtubeCatalog.getVideoMetadata(playlistVideoIds);
  const creator = channelTitle?.trim() || youtubePlaylist.snippet.channelTitle;
  const savedVideos = await saveApprovedVideos(parentId, videoMetadata, creator, category || 'LEARNING', childIds);
  const savedPlaylistVideoIds = videoMetadata
    .map((video) => savedVideos.get(video.youtubeId)?.id)
    .filter(Boolean);
  const id = `pl_${Date.now()}`;

  const newPlaylist = await db.addPlaylist({
    id,
    parentId,
    playlistId: cleanPlaylistId,
    title: title?.trim() || youtubePlaylist.snippet.title,
    channelTitle: creator,
    thumbnailUrl: thumbnailUrl ||
      youtubeCatalog.thumbnailFrom(youtubePlaylist.snippet.thumbnails) ||
      videoMetadata[0]?.thumbnailUrl,
    videoCount: savedPlaylistVideoIds.length,
    videoIds: savedPlaylistVideoIds.length > 0 ? savedPlaylistVideoIds : videoIds,
    category: (category || 'LEARNING').toUpperCase(),
    childIds,
    status: CONTENT_STATUS.APPROVED,
    createdAt: new Date().toISOString()
  });

  return newPlaylist;
}

async function removePlaylist(parentId, id) {
  const pl = await db.findPlaylistById(id);
  if (!pl || pl.parentId !== parentId) {
    throw { statusCode: 404, message: 'Playlist not found' };
  }

  await db.deletePlaylist(id);
  return { success: true, message: `Playlist "${pl.title}" removed` };
}

async function addVideo(parentId, { title, channelTitle, youtubeUrlOrId, category, durationText, thumbnailUrl, description, childIds: requestedChildIds }) {
  const childIds = await normalizeChildIds(parentId, requestedChildIds);
  const cleanYoutubeId = extractYouTubeVideoId(youtubeUrlOrId);
  if (!cleanYoutubeId) {
    throw { statusCode: 400, message: 'A valid YouTube video URL or 11-character ID is required' };
  }
  const metadata = await youtubeCatalog.getVideoMetadata([cleanYoutubeId]);
  const youtubeVideo = metadata[0];
  if (!youtubeVideo) {
    throw { statusCode: 404, message: 'YouTube video was not found or is unavailable.' };
  }
  const id = `vid_${Date.now()}`;
  const realThumbnail = thumbnailUrl || youtubeVideo.thumbnailUrl;

  const newVideo = await db.addVideo({
    id,
    parentId,
    youtubeId: cleanYoutubeId,
    title: title?.trim() || youtubeVideo.title,
    channelTitle: channelTitle?.trim() || youtubeVideo.channelTitle,
    category: (category || 'LEARNING').toUpperCase(),
    childIds,
    durationText: durationText || youtubeVideo.durationText,
    thumbnailUrl: realThumbnail,
    description: description || youtubeVideo.description,
    status: CONTENT_STATUS.APPROVED,
    createdAt: new Date().toISOString()
  });

  return newVideo;
}

async function removeVideo(parentId, id) {
  const vid = await db.findVideoById(id);
  if (!vid || vid.parentId !== parentId) {
    throw { statusCode: 404, message: 'Video not found' };
  }

  await db.deleteVideo(id);
  return { success: true, message: `Video "${vid.title}" removed` };
}

module.exports = {
  getApprovedContent,
  getVideoById,
  addChannel,
  removeChannel,
  syncChannel,
  addPlaylist,
  removePlaylist,
  addVideo,
  removeVideo
};
