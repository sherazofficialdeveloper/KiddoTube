const db = require('../models/db');
const { ACCOUNT_STATUS, CONTENT_STATUS, ROLES } = require('../constants/roles');
const { hashPassword, hashPin } = require('../utils/cryptoUtils');
const { validateEmail } = require('../validators/inputValidators');

async function getAdminDashboardHandler(req, res, next) {
  try {
    const parents = await db.getAllParents();
    const children = await db.getAllChildren();
    const channels = await db.getAllSystemChannels();
    const playlists = await db.getAllSystemPlaylists();
    const videos = await db.getAllSystemVideos();

    const activeParents = parents.filter(p => p.status === ACCOUNT_STATUS.ACTIVE).length;
    const disabledParents = parents.filter(p => p.status === ACCOUNT_STATUS.DISABLED).length;

    const activeChildren = children.filter(c => c.status === ACCOUNT_STATUS.ACTIVE).length;
    const disabledChildren = children.filter(c => c.status === ACCOUNT_STATUS.DISABLED).length;

    const stats = {
      totalUsers: parents.length + children.length,
      totalParents: parents.length,
      activeParents,
      disabledParents,
      totalChildren: children.length,
      activeChildren,
      disabledChildren,
      totalChannels: channels.length,
      totalPlaylists: playlists.length,
      totalVideos: videos.length,
      systemStatus: 'ONLINE / HEALTHY',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      databaseType: 'MongoDB NoSQL Document Database'
    };

    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

async function getAllParentsHandler(req, res, next) {
  try {
    const { search, status } = req.query;
    let parents = await db.getAllParents();
    const allChildren = await db.getAllChildren();
    const childrenByParentId = new Map();
    allChildren.forEach((child) => {
      const parentId = String(child.parentId || '');
      childrenByParentId.set(parentId, (childrenByParentId.get(parentId) || 0) + 1);
    });

    if (status) {
      parents = parents.filter(p => p.status === status.toUpperCase());
    }

    if (search) {
      const q = search.trim().toLowerCase();
      parents = parents.filter(p =>
        String(p.username || '').toLowerCase().includes(q) ||
        String(p.email || '').toLowerCase().includes(q) ||
        String(p.displayName || '').toLowerCase().includes(q)
      );
    }

    const safeParents = [];
    for (const p of parents) {
      // Strictly remove password and pin hashes
      const { passwordHash, pinHash, ...safe } = p;
      safeParents.push({
        ...safe,
        childrenCount: childrenByParentId.get(String(p.id)) || 0
      });
    }

    return res.status(200).json({ success: true, count: safeParents.length, data: safeParents });
  } catch (err) {
    next(err);
  }
}

async function toggleParentStatusHandler(req, res, next) {
  try {
    const { parentId } = req.params;
    const requestedStatus = req.body?.status || req.query?.status;
    const parent = await db.findParentById(parentId);
    if (!parent) {
      return res.status(404).json({ success: false, error: 'Parent account not found' });
    }

    let newStatus = parent.status === ACCOUNT_STATUS.ACTIVE ? ACCOUNT_STATUS.DISABLED : ACCOUNT_STATUS.ACTIVE;
    if (requestedStatus && ['ACTIVE', 'DISABLED', 'BLOCKED'].includes(requestedStatus.toUpperCase())) {
      newStatus = requestedStatus.toUpperCase();
    }

    const updated = await db.updateParent(parentId, { status: newStatus });

    if (newStatus === ACCOUNT_STATUS.DISABLED || newStatus === ACCOUNT_STATUS.BLOCKED) {
      await db.deleteSessionsForParent(parentId);
    }

    const { passwordHash, pinHash, ...safe } = updated;
    return res.status(200).json({
      success: true,
      data: safe,
      message: `Parent account status updated to ${newStatus}.`
    });
  } catch (err) {
    next(err);
  }
}

async function getAllChildrenHandler(req, res, next) {
  try {
    const { search, status } = req.query;
    let children = await db.getAllChildren();

    if (status) {
      children = children.filter(c => c.status === status.toUpperCase());
    }

    if (search) {
      const q = search.trim().toLowerCase();
      children = children.filter(c =>
        c.username.toLowerCase().includes(q) ||
        (c.displayName && c.displayName.toLowerCase().includes(q))
      );
    }

    const safeChildren = [];
    for (const c of children) {
      const parent = await db.findParentById(c.parentId);
      // Strictly remove password hash
      const { passwordHash, ...safe } = c;
      safeChildren.push({
        ...safe,
        parentUsername: parent ? parent.username : 'Unknown'
      });
    }

    return res.status(200).json({ success: true, count: safeChildren.length, data: safeChildren });
  } catch (err) {
    next(err);
  }
}

async function toggleChildStatusHandler(req, res, next) {
  try {
    const { childId } = req.params;
    const requestedStatus = req.body?.status || req.query?.status;
    const child = await db.findChildById(childId);
    if (!child) {
      return res.status(404).json({ success: false, error: 'Child account not found' });
    }

    let newStatus = child.status === ACCOUNT_STATUS.ACTIVE ? ACCOUNT_STATUS.DISABLED : ACCOUNT_STATUS.ACTIVE;
    if (requestedStatus && ['ACTIVE', 'DISABLED', 'BLOCKED'].includes(requestedStatus.toUpperCase())) {
      newStatus = requestedStatus.toUpperCase();
    }

    const updated = await db.updateChild(childId, { status: newStatus });

    if (newStatus === ACCOUNT_STATUS.DISABLED || newStatus === ACCOUNT_STATUS.BLOCKED) {
      await db.deleteSessionsForChild(childId);
    }

    const { passwordHash, ...safe } = updated;
    return res.status(200).json({
      success: true,
      data: safe,
      message: `Child account status updated to ${newStatus}.`
    });
  } catch (err) {
    next(err);
  }
}

async function getAllContentHandler(req, res, next) {
  try {
    const parents = await db.getAllParents();
    const children = await db.getAllChildren();
    const channels = await db.getAllSystemChannels();
    const playlists = await db.getAllSystemPlaylists();
    const videos = await db.getAllSystemVideos();

    const parentMap = new Map();
    parentMap.set('admin_1', 'System Administrator');
    parentMap.set('admin', 'KiddoTube Admin');
    parentMap.set('system', 'System Administrator');

    parents.forEach(p => {
      const name = p.displayName || p.username || (p.email ? p.email.split('@')[0] : 'Parent');
      if (p.id) parentMap.set(String(p.id), name);
      if (p._id) parentMap.set(String(p._id), name);
      if (p.username) parentMap.set(String(p.username), name);
      if (p.email) parentMap.set(String(p.email).toLowerCase(), name);
    });

    const childMap = new Map();
    children.forEach(c => {
      const name = c.displayName || c.username || 'Child';
      if (c.id) childMap.set(String(c.id), name);
      if (c._id) childMap.set(String(c._id), name);
    });

    const resolveParent = (pId) => {
      if (!pId) return 'KiddoTube Parent';
      const cleanId = String(pId);
      if (parentMap.has(cleanId)) return parentMap.get(cleanId);
      if (cleanId === 'admin_1' || cleanId === 'admin' || cleanId === 'system') return 'System Administrator';
      return 'KiddoTube Parent';
    };

    const enrichedChannels = channels.map(ch => ({
      ...ch,
      parentName: resolveParent(ch.parentId),
      allowedChildNames: (ch.childIds || []).map(cid => childMap.get(String(cid))).filter(Boolean)
    }));

    const enrichedPlaylists = playlists.map(pl => ({
      ...pl,
      parentName: resolveParent(pl.parentId),
      allowedChildNames: (pl.childIds || []).map(cid => childMap.get(String(cid))).filter(Boolean)
    }));

    const enrichedVideos = videos.map(vid => {
      const parentName = resolveParent(vid.parentId);
      const allowedChildNames = (vid.childIds || []).map(cid => childMap.get(String(cid))).filter(Boolean);

      const matchedPlaylist = playlists.find(pl =>
        String(pl.parentId || '') === String(vid.parentId || '') &&
        Array.isArray(pl.videoIds) &&
        pl.videoIds.some(id => String(id) === String(vid.id) || String(id) === String(vid.youtubeId))
      );

      const matchedChannel = channels.find(ch =>
        String(ch.parentId || '') === String(vid.parentId || '') &&
        ch.title &&
        vid.channelTitle &&
        ch.title.toLowerCase().trim() === vid.channelTitle.toLowerCase().trim()
      );

      let sourceType = 'DIRECT';
      let sourceName = 'Direct Video';
      if (matchedPlaylist) {
        sourceType = 'PLAYLIST';
        sourceName = `Playlist: ${matchedPlaylist.title}`;
      } else if (matchedChannel) {
        sourceType = 'CHANNEL';
        sourceName = matchedChannel.title || matchedChannel.channelId || 'Channel';
      }

      return {
        ...vid,
        parentName,
        allowedChildNames,
        sourceType,
        sourceName
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        channels: enrichedChannels,
        playlists: enrichedPlaylists,
        videos: enrichedVideos
      }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteParentHandler(req, res, next) {
  try {
    const { parentId } = req.params;
    const parent = await db.findParentById(parentId);
    if (!parent) {
      return res.status(404).json({ success: false, error: 'Parent account not found' });
    }
    await db.deleteParent(parentId);
    return res.status(200).json({
      success: true,
      message: `Parent account "${parent.username}" and associated data permanently deleted.`
    });
  } catch (err) {
    next(err);
  }
}

async function deleteChildHandler(req, res, next) {
  try {
    const { childId } = req.params;
    const child = await db.findChildById(childId);
    if (!child) {
      return res.status(404).json({ success: false, error: 'Child account not found' });
    }
    await db.deleteChild(childId);
    await db.deleteSessionsForChild(childId);
    return res.status(200).json({
      success: true,
      message: `Child account "${child.displayName || child.username}" permanently deleted.`
    });
  } catch (err) {
    next(err);
  }
}

async function moderateContentHandler(req, res, next) {
  try {
    const { type, id, action = 'BLOCK' } = req.body || {};
    if (!type || !id) {
      return res.status(400).json({ success: false, error: 'Content type and id are required' });
    }
    if (!['channel', 'playlist', 'video'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Unsupported content type' });
    }
    if (!['BLOCK', 'REMOVE'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Unsupported moderation action' });
    }

    if (type === 'channel') {
      if (action === 'REMOVE') {
        const removed = await db.deleteChannel(id);
        if (!removed) {
          return res.status(404).json({ success: false, error: 'Channel not found' });
        }
      } else {
        const updated = await db.updateChannel(id, { status: CONTENT_STATUS.BLOCKED });
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Channel not found' });
        }
        if (updated.title) {
          const escaped = updated.title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const filter = {
            channelTitle: { $regex: new RegExp(`^${escaped}$`, 'i') }
          };
          if (updated.parentId) {
            filter.parentId = String(updated.parentId);
          }
          const dbInstance = await db.getDb();
          await dbInstance.collection('videos').updateMany(filter, { $set: { status: CONTENT_STATUS.BLOCKED } });
        }
      }
    } else if (type === 'playlist') {
      if (action === 'REMOVE') await db.deletePlaylist(id);
      else await db.updatePlaylist(id, { status: CONTENT_STATUS.BLOCKED });
    } else if (type === 'video') {
      if (action === 'REMOVE') {
        const removed = await db.deleteVideo(id);
        if (!removed) {
          return res.status(404).json({ success: false, error: 'Video not found' });
        }
      } else {
        const updated = await db.updateVideo(id, { status: CONTENT_STATUS.BLOCKED });
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Video not found' });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Content ${id} moderated with action ${action}.`
    });
  } catch (err) {
    next(err);
  }
}

async function createParentHandler(req, res, next) {
  try {
    const { username, email, password, displayName, dailyLimitMinutes, pin } = req.body;
    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!validateEmail(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    if (pin != null && pin !== '' && (!/^\d{4}$/.test(String(pin).trim()))) {
      return res.status(400).json({ success: false, error: 'Parent PIN must be exactly 4 digits' });
    }

    const cleanUser = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check uniqueness across both username and email
    const existing = (await db.findParentByUsernameOrEmail(cleanUser)) || (await db.findParentByUsernameOrEmail(cleanEmail));
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username or email already in use' });
    }

    const parentId = `parent_${Date.now()}`;
    const newParent = await db.createParent({
      id: parentId,
      username: cleanUser,
      displayName: (displayName && displayName.trim()) || cleanUser,
      email: cleanEmail,
      passwordHash: hashPassword(password.trim()),
      pinHash: pin ? hashPin(String(pin).trim()) : null,
      dailyLimitMinutes: Number(dailyLimitMinutes) || 60,
      status: ACCOUNT_STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const { passwordHash, pinHash, ...safeParent } = newParent;
    return res.status(201).json({
      success: true,
      data: safeParent,
      message: `Parent account "${safeParent.username}" created successfully.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminDashboardHandler,
  getAllParentsHandler,
  createParentHandler,
  toggleParentStatusHandler,
  deleteParentHandler,
  getAllChildrenHandler,
  toggleChildStatusHandler,
  deleteChildHandler,
  getAllContentHandler,
  moderateContentHandler
};
