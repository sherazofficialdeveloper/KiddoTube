require('../config');
const { MongoClient } = require('mongodb');
const { ROLES, ACCOUNT_STATUS, CONTENT_STATUS } = require('../constants/roles');
const { hashPassword, hashPin } = require('../utils/cryptoUtils');

function escapeRegex(str) {
  return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class MongoDatabase {
  constructor() {
    this.client = null;
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async init(customUri = null) {
    if (this.isInitialized && this.db) {
      return this.db;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const uri = customUri || process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DATABASE || 'kidsstream';

      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set.');
      }

      const createMongoClient = (targetUri) => {
        return new MongoClient(targetUri, {
          serverSelectionTimeoutMS: 10000, // Thoda time barha diya
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 25,
          minPoolSize: 1,
          retryReads: true,
          retryWrites: true,
          autoSelectFamily: false, // ✅ SSL WRONG_VERSION_NUMBER error fix
        });
      };

      try {
        this.client = createMongoClient(uri);
        await this.client.connect();
        this.db = this.client.db(dbName);
        this.isInitialized = true;
        console.log(`[MongoDB] Successfully connected to database: ${dbName}`);

        await this.createIndexes();
        await this.seedIfEmpty();
        return this.db;
      } catch (err) {
        console.error(`[MongoDB] Primary connection failed: ${err.message}`);
        this.initPromise = null;
        this.client = null;
        this.db = null;
        this.isInitialized = false;
        throw new Error(`MongoDB connection failed: ${err.message}`);
      }
    })();

    return this.initPromise;
  }

  async getDb() {
    if (!this.isInitialized || !this.db) {
      await this.init();
    }
    return this.db;
  }

  async createIndexes() {
    const db = this.db;
    try {
      // 1. Parents collection indexes
      await db.collection('parents').createIndex({ username: 1 }, { unique: true });
      await db.collection('parents').createIndex({ email: 1 }, { unique: true });

      // 2. Children collection indexes
      await db.collection('children').createIndex({ parentId: 1 });
      await db.collection('children').createIndex({ parentId: 1, username: 1 }, { unique: true });
      // 3. Admins collection indexes
      await db.collection('admins').createIndex({ username: 1 }, { unique: true });
      await db.collection('admins').createIndex({ email: 1 }, { unique: true });

      // 4. Channels collection indexes
      await db.collection('channels').createIndex({ parentId: 1 });
      await db.collection('channels').createIndex({ parentId: 1, channelId: 1 }, { unique: true });

      // 5. Playlists collection indexes
      await db.collection('playlists').createIndex({ parentId: 1 });
      await db.collection('playlists').createIndex({ parentId: 1, playlistId: 1 }, { unique: true });

      // 6. Videos collection indexes
      await db.collection('videos').createIndex({ parentId: 1 });
      await db.collection('videos').createIndex({ parentId: 1, youtubeId: 1 }, { unique: true });
      await db.collection('videos').createIndex({ category: 1 });

      // 7. Watch Time Records collection indexes
      await db.collection('watchTimeRecords').createIndex({ parentId: 1 });
      await db.collection('watchTimeRecords').createIndex({ childId: 1, dateString: 1 }, { unique: true });

      // 8. PIN Attempts collection indexes
      await db.collection('pinAttempts').createIndex({ parentId: 1 }, { unique: true });

      // 9. Sessions collection indexes
      await db.collection('sessions').createIndex({ token: 1 }, { unique: true });
      await db.collection('sessions').createIndex({ userId: 1 });

      const children = db.collection('children');
      const legacyChildren = await children
        .find({ usernameNormalized: { $exists: false }, username: { $type: 'string' } })
        .project({ _id: 1, username: 1 })
        .toArray();
      for (const child of legacyChildren) {
        await children.updateOne(
          { _id: child._id },
          { $set: { usernameNormalized: child.username.trim().toLowerCase() } }
        );
      }
      await children.updateMany(
        { plainPassword: { $exists: true } },
        { $unset: { plainPassword: '' } }
      );
      await children.createIndex(
        { usernameNormalized: 1 },
        {
          unique: true,
          partialFilterExpression: { usernameNormalized: { $type: 'string' } }
        }
      );
    } catch (idxErr) {
      console.warn('[MongoDB] Index creation notice:', idxErr.message);
    }
  }

  async seedIfEmpty() {
    const db = this.db;
    const now = new Date().toISOString();

    // Ensure system administrator exists and is active
    try {
      const existingAdmin = await db.collection('admins').findOne({
        $or: [{ _id: 'admin_1' }, { username: 'admin' }, { email: 'admin@kidsstream.app' }]
      });
      if (!existingAdmin) {
        await db.collection('admins').insertOne({
          _id: 'admin_1',
          username: 'admin',
          displayName: 'System Administrator',
          email: 'admin@kidsstream.app',
          passwordHash: hashPassword('admin123'),
          role: ROLES.ADMIN,
          status: ACCOUNT_STATUS.ACTIVE,
          createdAt: now
        });
      } else {
        await db.collection('admins').updateOne(
          { _id: existingAdmin._id },
          {
            $set: {
              username: 'admin',
              passwordHash: hashPassword('admin123'),
              role: ROLES.ADMIN,
              status: ACCOUNT_STATUS.ACTIVE
            }
          }
        );
      }
    } catch (adminErr) {
      console.warn('[MongoDB] Admin seeding notice:', adminErr.message);
    }

    const parentCount = await db.collection('parents').countDocuments();
    if (parentCount > 0) return;

    const defaultParentId = 'parent_1';

    await db.collection('parents').insertOne({
      _id: defaultParentId,
      username: 'parent',
      displayName: 'Sarah Jenkins',
      email: 'parent@kidsstream.app',
      passwordHash: hashPassword('parent123'),
      pinHash: hashPin('1234'),
      dailyLimitMinutes: 60,
      status: ACCOUNT_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now
    });

    await db.collection('children').insertMany([
      {
        _id: 'kid_1',
        parentId: defaultParentId,
        username: 'Ethan',
        usernameNormalized: 'ethan',
        displayName: 'Ethan (Ninja Explorer)',
        passwordHash: hashPassword('1234'),
        avatarEmoji: '🥷',
        colorHex: 0xFF00A6FB,
        ageGroup: 8,
        status: ACCOUNT_STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'kid_2',
        parentId: defaultParentId,
        username: 'Jessica',
        usernameNormalized: 'jessica',
        displayName: 'Jessica (Story Explorer)',
        passwordHash: hashPassword('1234'),
        avatarEmoji: '🕯️',
        colorHex: 0xFFFF4081,
        ageGroup: 6,
        status: ACCOUNT_STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now
      },
      {
        _id: 'kid_3',
        parentId: defaultParentId,
        username: 'Michelle',
        usernameNormalized: 'michelle',
        displayName: 'Michelle (Tiny Explorer)',
        passwordHash: hashPassword('1234'),
        avatarEmoji: '🍞',
        colorHex: 0xFF00BFA5,
        ageGroup: 4,
        status: ACCOUNT_STATUS.ACTIVE,
        createdAt: now,
        updatedAt: now
      }
    ]);

    await db.collection('admins').insertOne({
      _id: 'admin_1',
      username: 'admin',
      displayName: 'System Administrator',
      email: 'admin@kidsstream.app',
      passwordHash: hashPassword('admin123'),
      role: ROLES.ADMIN,
      status: ACCOUNT_STATUS.ACTIVE,
      createdAt: now
    });

    await db.collection('channels').insertMany([
      {
        _id: 'ch_1',
        parentId: defaultParentId,
        channelId: 'UCsooa4yRKGN_zEE8iknghZA',
        title: 'SciShow Kids',
        avatarUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&auto=format&fit=crop&q=80',
        videoCount: 24,
        colorAccentHex: 0xFF00A6FB,
        description: 'Fun, curious, hands-on scientific adventures made specially for young minds!',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'ch_2',
        parentId: defaultParentId,
        channelId: 'UC4NALVCmcmL5_DPO0545s_A',
        title: 'Nursery Songville',
        avatarUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80',
        videoCount: 42,
        colorAccentHex: 0xFFFF4081,
        description: 'Gentle melodies, nursery rhymes, lullabies, and delightful classic tunes.',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'ch_3',
        parentId: defaultParentId,
        channelId: 'UC3_T_StoryTimeAdv',
        title: 'StoryTime Adventures',
        avatarUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=150&auto=format&fit=crop&q=80',
        videoCount: 19,
        colorAccentHex: 0xFF8338EC,
        description: 'Enchanting animated fairy tales, bedtime stories, and moral fables.',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      }
    ]);

    await db.collection('playlists').insertMany([
      {
        _id: 'pl_1',
        parentId: defaultParentId,
        playlistId: 'p1',
        title: 'Bedtime Calm & Lullabies 🌙',
        channelTitle: 'Nursery Songville',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        videoCount: 4,
        videoIds: ['vid_2', 'vid_3', 'vid_6'],
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'pl_2',
        parentId: defaultParentId,
        playlistId: 'p2',
        title: 'Outer Space & Solar System 🚀',
        channelTitle: 'SciShow Kids',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
        videoCount: 6,
        videoIds: ['vid_1', 'vid_5'],
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'pl_3',
        parentId: defaultParentId,
        playlistId: 'p3',
        title: 'Animal Safari & Wild Oceans 🐬',
        channelTitle: 'Animal Planet Junior',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80',
        videoCount: 5,
        videoIds: ['vid_7'],
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      }
    ]);

    await db.collection('videos').insertMany([
      {
        _id: 'vid_1',
        parentId: defaultParentId,
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Learn about NASA Satellites! 🛰️ | PODCAST FOR KIDS 🎧',
        channelTitle: 'SciShow Kids',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
        durationText: '51:36',
        category: 'LEARNING',
        description: 'Explore outer space rockets, satellites, and planets with fun animations!',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'vid_2',
        parentId: defaultParentId,
        youtubeId: 'XqZsoesa55w',
        title: 'I AM BRAVE! - Self-confidence song for kids 🚲✈️',
        channelTitle: 'Nursery Songville',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80',
        durationText: '02:35',
        category: 'MUSIC',
        description: 'Sing along with brave adventures, planes, trains, and bicycles!',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'vid_3',
        parentId: defaultParentId,
        youtubeId: '3JZ_D3ELwOQ',
        title: 'Mary Had a Little Lamb | Nursery Rhymes & Baby Songs 🐑🌳',
        channelTitle: 'Nursery Songville',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        durationText: '1:36:29',
        category: 'MUSIC',
        description: 'Beautiful animated 3D rhymes and nursery songs for gentle playtime.',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'vid_4',
        parentId: defaultParentId,
        youtubeId: 'kJQP7kiw5Fk',
        title: 'The Brave Little Tugboat and the Big Harbor 🚢⚓',
        channelTitle: 'StoryTime Adventures',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=600&auto=format&fit=crop&q=80',
        durationText: '09:48',
        category: 'SHOWS',
        description: 'An animated bedtime tale about bravery, teamwork, and kind friendship.',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'vid_5',
        parentId: defaultParentId,
        youtubeId: 'fJ9rUzIMcZQ',
        title: 'Counting 1 to 20 with Colorful Bouncing Balloons 🎈🔢',
        channelTitle: 'SciShow Kids',
        thumbnailUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
        durationText: '04:10',
        category: 'LEARNING',
        description: 'Bright colors, cheerful sounds, and counting numbers made super simple.',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'vid_6',
        parentId: defaultParentId,
        youtubeId: 'L_LUpnjgPso',
        title: 'Twinkle Twinkle Little Star & Lullabies for Sleep 🌙⭐',
        channelTitle: 'Nursery Songville',
        thumbnailUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80',
        durationText: '12:05',
        category: 'MUSIC',
        description: 'Gentle calming music and twinkling stars to relax and unwind.',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      },
      {
        _id: 'vid_7',
        parentId: defaultParentId,
        youtubeId: '9bZkp7q19f0',
        title: 'Curious Dinosaurs: The Gentle Giant Brachiosaurus 🦕🌿',
        channelTitle: 'Animal Planet Junior',
        thumbnailUrl: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=600&auto=format&fit=crop&q=80',
        durationText: '06:33',
        category: 'EXPLORE',
        description: 'Discover fascinating facts about prehistoric herbivore dinosaurs.',
        status: CONTENT_STATUS.APPROVED,
        createdAt: now
      }
    ]);
  }

  mapDoc(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    delete rest.passwordEncrypted;
    return { id: String(_id), ...rest };
  }

  // --- Parents ---
  async findParentById(id) {
    const db = await this.getDb();
    const doc = await db.collection('parents').findOne({ _id: String(id) });
    return this.mapDoc(doc);
  }

  async findParentByUsernameOrEmail(identifier) {
    if (!identifier) return null;
    const db = await this.getDb();
    const clean = String(identifier).trim();
    const escaped = escapeRegex(clean);
    const doc = await db.collection('parents').findOne({
      $or: [
        { _id: clean },
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { email: clean.toLowerCase() }
      ]
    });
    return this.mapDoc(doc);
  }

  async createParent(parentData) {
    const db = await this.getDb();
    const id = parentData.id || `parent_${Date.now()}`;
    const now = new Date().toISOString();
    const doc = {
      _id: id,
      username: parentData.username,
      displayName: parentData.displayName || parentData.username,
      email: parentData.email,
      passwordHash: parentData.passwordHash,
      pinHash: parentData.pinHash,
      dailyLimitMinutes: Number(parentData.dailyLimitMinutes) || 60,
      status: parentData.status || ACCOUNT_STATUS.ACTIVE,
      createdAt: parentData.createdAt || now,
      updatedAt: parentData.updatedAt || now
    };
    await db.collection('parents').insertOne(doc);
    return this.mapDoc(doc);
  }

  async updateParent(id, updateFields) {
    const db = await this.getDb();
    const setFields = { ...updateFields, updatedAt: new Date().toISOString() };
    delete setFields.id;
    delete setFields._id;
    await db.collection('parents').updateOne({ _id: String(id) }, { $set: setFields });
    return this.findParentById(id);
  }

  async getAllParents() {
    const db = await this.getDb();
    const docs = await db.collection('parents').find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  async deleteParent(id) {
    const db = await this.getDb();
    const parentIdStr = String(id);
    const children = await db.collection('children').find({ parentId: parentIdStr }).toArray();
    for (const child of children) {
      await this.deleteChild(child._id || child.id);
    }
    await db.collection('videos').deleteMany({ parentId: parentIdStr });
    await db.collection('channels').deleteMany({ parentId: parentIdStr });
    await db.collection('playlists').deleteMany({ parentId: parentIdStr });
    await db.collection('pinAttempts').deleteMany({ parentId: parentIdStr });
    await this.deleteSessionsForParent(parentIdStr);
    const result = await db.collection('parents').deleteOne({ _id: parentIdStr });
    return result.deletedCount > 0;
  }

  // --- Children ---
  async findChildById(id) {
    const db = await this.getDb();
    const doc = await db.collection('children').findOne({ _id: String(id) });
    return this.mapDoc(doc);
  }

  async findChildPasswordEncrypted(id) {
    const db = await this.getDb();
    const doc = await db.collection('children').findOne(
      { _id: String(id) },
      { projection: { passwordEncrypted: 1 } }
    );
    return doc?.passwordEncrypted || null;
  }

  async findChildByUsername(parentId, username) {
    const db = await this.getDb();
    const clean = (username || '').trim();
    if (!clean) return null;
    const escaped = escapeRegex(clean);
    const doc = await db.collection('children').findOne({
      parentId: String(parentId),
      username: { $regex: new RegExp(`^${escaped}$`, 'i') }
    });
    return this.mapDoc(doc);
  }

  async findChildByGlobalUsername(username) {
    const db = await this.getDb();
    const clean = (username || '').trim();
    if (!clean) return null;
    const escaped = escapeRegex(clean);
    const doc = await db.collection('children').findOne({
      $or: [
        { usernameNormalized: clean.toLowerCase() },
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      ]
    });
    return this.mapDoc(doc);
  }

  async findChildrenByParentId(parentId) {
    const db = await this.getDb();
    const docs = await db.collection('children').find({ parentId: String(parentId) }).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  async createChild(childData) {
    const db = await this.getDb();
    const id = childData.id || `kid_${Date.now()}`;
    const now = new Date().toISOString();
    const doc = {
      _id: id,
      parentId: String(childData.parentId),
      username: childData.username,
      usernameNormalized: String(childData.username || '').trim().toLowerCase(),
      displayName: childData.displayName || childData.username,
      passwordHash: childData.passwordHash,
      passwordEncrypted: childData.passwordEncrypted,
      avatarEmoji: childData.avatarEmoji || '🎈',
      colorHex: Number(childData.colorHex) || 0xFF00A6FB,
      ageGroup: Number(childData.ageGroup) || 6,
      status: childData.status || ACCOUNT_STATUS.ACTIVE,
      createdAt: childData.createdAt || now,
      updatedAt: childData.updatedAt || now
    };
    delete doc.plainPassword;
    await db.collection('children').insertOne(doc);
    return this.mapDoc(doc);
  }

  async updateChild(id, updateFields) {
    const db = await this.getDb();
    const setFields = { ...updateFields, updatedAt: new Date().toISOString() };
    delete setFields.id;
    delete setFields._id;
    await db.collection('children').updateOne({ _id: String(id) }, { $set: setFields });
    return this.findChildById(id);
  }

  async deleteChild(id) {
    const db = await this.getDb();
    const childIdStr = String(id);
    await db.collection('children').deleteOne({ _id: childIdStr });
    await db.collection('watchTimeRecords').deleteMany({ childId: childIdStr });
    await db.collection('sessions').deleteMany({ childId: childIdStr });

    // 1. Cascade delete or update Channels assigned to this child
    try {
      const channels = await db.collection('channels').find({
        $or: [
          { childIds: childIdStr },
          { childIds: [childIdStr] }
        ]
      }).toArray();

      for (const channel of channels) {
        const remaining = (channel.childIds || []).map(String).filter((c) => c !== childIdStr);
        if (remaining.length === 0) {
          // Exclusively assigned to this child (or all assigned children now deleted) -> Delete channel completely
          await db.collection('channels').deleteOne({ _id: channel._id });
          // Also delete all videos from this channel under this parent
          if (channel.title) {
            const escaped = channel.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            await db.collection('videos').deleteMany({
              parentId: channel.parentId,
              channelTitle: { $regex: new RegExp(`^${escaped}$`, 'i') }
            });
          }
        } else {
          // Still assigned to other children -> Just remove this childId from the audience
          await db.collection('channels').updateOne(
            { _id: channel._id },
            { $set: { childIds: remaining } }
          );
        }
      }
    } catch (chErr) {
      console.warn(`[db.deleteChild] Error cascading channels for child ${childIdStr}:`, chErr.message);
    }

    // 2. Cascade delete or update Playlists assigned to this child
    try {
      const playlists = await db.collection('playlists').find({
        $or: [
          { childIds: childIdStr },
          { childIds: [childIdStr] }
        ]
      }).toArray();

      for (const playlist of playlists) {
        const remaining = (playlist.childIds || []).map(String).filter((c) => c !== childIdStr);
        if (remaining.length === 0) {
          await db.collection('playlists').deleteOne({ _id: playlist._id });
        } else {
          await db.collection('playlists').updateOne(
            { _id: playlist._id },
            { $set: { childIds: remaining } }
          );
        }
      }
    } catch (plErr) {
      console.warn(`[db.deleteChild] Error cascading playlists for child ${childIdStr}:`, plErr.message);
    }

    // 3. Cascade delete or update Videos assigned to this child
    try {
      const videos = await db.collection('videos').find({
        $or: [
          { childIds: childIdStr },
          { childIds: [childIdStr] },
          { childId: childIdStr }
        ]
      }).toArray();

      for (const video of videos) {
        const remaining = (video.childIds || []).map(String).filter((c) => c !== childIdStr);
        if (remaining.length === 0) {
          // Exclusively assigned to this child (or all assigned children now deleted) -> Delete video completely
          await db.collection('videos').deleteOne({ _id: video._id });
        } else {
          // Still assigned to other children -> Just remove this childId from the audience
          await db.collection('videos').updateOne(
            { _id: video._id },
            { $set: { childIds: remaining } }
          );
        }
      }
    } catch (vidErr) {
      console.warn(`[db.deleteChild] Error cascading videos for child ${childIdStr}:`, vidErr.message);
    }

    return true;
  }

  async getAllChildren() {
    const db = await this.getDb();
    const docs = await db.collection('children').find({}).sort({ createdAt: -1 }).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  // --- Admins ---
  async findAdminById(id) {
    const db = await this.getDb();
    const doc = await db.collection('admins').findOne({ _id: String(id) });
    return this.mapDoc(doc);
  }

  async findAdminByUsernameOrEmail(identifier) {
    if (!identifier) return null;
    const db = await this.getDb();
    const clean = identifier.trim().toLowerCase();
    const doc = await db.collection('admins').findOne({
      $or: [
        { username: { $regex: new RegExp(`^${clean}$`, 'i') } },
        { email: { $regex: new RegExp(`^${clean}$`, 'i') } }
      ]
    });
    return this.mapDoc(doc);
  }

  // --- Channels ---
  async getChannels(parentId, statusFilter = null) {
    const db = await this.getDb();
    const query = { parentId: String(parentId) };
    if (statusFilter) {
      query.status = statusFilter;
    }
    const docs = await db.collection('channels').find(query).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  async findChannelById(id) {
    const db = await this.getDb();
    const doc = await db.collection('channels').findOne({ _id: String(id) });
    return this.mapDoc(doc);
  }

  async addChannel(channelData) {
    const db = await this.getDb();
    const id = channelData.id || `ch_${Date.now()}`;
    const doc = {
      _id: id,
      parentId: String(channelData.parentId),
      channelId: channelData.channelId,
      title: channelData.title,
      avatarUrl: channelData.avatarUrl,
      videoCount: Number.isFinite(Number(channelData.videoCount))
        ? Math.max(0, Number(channelData.videoCount))
        : 1,
      colorAccentHex: Number(channelData.colorAccentHex) || 0xFF00A6FB,
      description: channelData.description || '',
      status: channelData.status || CONTENT_STATUS.APPROVED,
      childIds: Array.isArray(channelData.childIds) ? channelData.childIds.map(String) : [],
      createdAt: channelData.createdAt || new Date().toISOString()
    };
    await db.collection('channels').insertOne(doc);
    return this.mapDoc(doc);
  }

  async updateChannel(id, updateFields) {
    const db = await this.getDb();
    const setFields = { ...updateFields };
    delete setFields.id;
    delete setFields._id;
    await db.collection('channels').updateOne({ _id: String(id) }, { $set: setFields });
    return this.findChannelById(id);
  }

  async deleteChannel(id) {
    const db = await this.getDb();
    let channel = await this.findChannelById(id);
    if (!channel) {
      const raw = await db.collection('channels').findOne({
        $or: [{ _id: String(id) }, { id: String(id) }]
      });
      if (raw) {
        channel = this.mapDoc(raw);
      }
    }
    const result = await db.collection('channels').deleteOne({
      $or: [{ _id: String(id) }, { id: String(id) }]
    });
    if (channel && channel.title) {
      const cleanTitle = channel.title.trim();
      const escaped = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const filter = {
        channelTitle: { $regex: new RegExp(`^${escaped}$`, 'i') }
      };
      if (channel.parentId) {
        filter.parentId = String(channel.parentId);
      }
      await db.collection('videos').deleteMany(filter);
    }
    return result.deletedCount > 0 || Boolean(channel);
  }

  async getAllSystemChannels() {
    const db = await this.getDb();
    const docs = await db.collection('channels').find({}).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  // --- Playlists ---
  async getPlaylists(parentId, statusFilter = null) {
    const db = await this.getDb();
    const query = { parentId: String(parentId) };
    if (statusFilter) {
      query.status = statusFilter;
    }
    const docs = await db.collection('playlists').find(query).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  async findPlaylistById(id) {
    const db = await this.getDb();
    const doc = await db.collection('playlists').findOne({ _id: String(id) });
    return this.mapDoc(doc);
  }

  async addPlaylist(playlistData) {
    const db = await this.getDb();
    const id = playlistData.id || `pl_${Date.now()}`;
    const doc = {
      _id: id,
      parentId: String(playlistData.parentId),
      playlistId: playlistData.playlistId,
      title: playlistData.title,
      channelTitle: playlistData.channelTitle || '',
      thumbnailUrl: playlistData.thumbnailUrl,
      videoCount: Number.isFinite(Number(playlistData.videoCount))
        ? Math.max(0, Number(playlistData.videoCount))
        : 1,
      videoIds: Array.isArray(playlistData.videoIds) ? playlistData.videoIds : [],
      status: playlistData.status || CONTENT_STATUS.APPROVED,
      childIds: Array.isArray(playlistData.childIds) ? playlistData.childIds.map(String) : [],
      createdAt: playlistData.createdAt || new Date().toISOString()
    };
    await db.collection('playlists').insertOne(doc);
    return this.mapDoc(doc);
  }

  async updatePlaylist(id, updateFields) {
    const db = await this.getDb();
    const setFields = { ...updateFields };
    delete setFields.id;
    delete setFields._id;
    await db.collection('playlists').updateOne({ _id: String(id) }, { $set: setFields });
    return this.findPlaylistById(id);
  }

  async deletePlaylist(id) {
    const db = await this.getDb();
    await db.collection('playlists').deleteOne({ _id: String(id) });
    return true;
  }

  async getAllSystemPlaylists() {
    const db = await this.getDb();
    const docs = await db.collection('playlists').find({}).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  // --- Videos ---
  async getVideos(parentId, statusFilter = null) {
    const db = await this.getDb();
    const query = { parentId: String(parentId) };
    if (statusFilter) {
      query.status = statusFilter;
    }
    const docs = await db.collection('videos').find(query).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  async findVideoById(id) {
    const db = await this.getDb();
    const doc = await db.collection('videos').findOne({ _id: String(id) });
    return this.mapDoc(doc);
  }

  async addVideo(videoData) {
    const db = await this.getDb();
    const id = videoData.id || `vid_${Date.now()}`;
    const doc = {
      _id: id,
      parentId: String(videoData.parentId),
      youtubeId: videoData.youtubeId,
      title: videoData.title,
      channelTitle: videoData.channelTitle || 'Approved Channel',
      thumbnailUrl: videoData.thumbnailUrl,
      durationText: videoData.durationText || '05:00',
      category: videoData.category || 'LEARNING',
      childIds: Array.isArray(videoData.childIds) ? videoData.childIds.map(String) : [],
      description: videoData.description || '',
      status: videoData.status || CONTENT_STATUS.APPROVED,
      createdAt: videoData.createdAt || new Date().toISOString()
    };
    await db.collection('videos').insertOne(doc);
    return this.mapDoc(doc);
  }

  async addVideos(videoList) {
    if (!videoList || videoList.length === 0) return [];
    const db = await this.getDb();
    const docs = videoList.map((videoData) => ({
      _id: videoData.id || `vid_${Date.now()}_${videoData.youtubeId}`,
      parentId: String(videoData.parentId),
      youtubeId: videoData.youtubeId,
      title: videoData.title,
      channelTitle: videoData.channelTitle || 'Approved Channel',
      thumbnailUrl: videoData.thumbnailUrl,
      durationText: videoData.durationText || '05:00',
      category: videoData.category || 'LEARNING',
      childIds: Array.isArray(videoData.childIds) ? videoData.childIds.map(String) : [],
      description: videoData.description || '',
      status: videoData.status || CONTENT_STATUS.APPROVED,
      createdAt: videoData.createdAt || new Date().toISOString()
    }));
    await db.collection('videos').insertMany(docs, { ordered: false });
    return docs.map(d => this.mapDoc(d));
  }

  async updateVideo(id, updateFields) {
    const db = await this.getDb();
    const setFields = { ...updateFields };
    delete setFields.id;
    delete setFields._id;
    await db.collection('videos').updateOne({ _id: String(id) }, { $set: setFields });
    return this.findVideoById(id);
  }

  async deleteVideo(id) {
    const db = await this.getDb();
    const result = await db.collection('videos').deleteOne({ _id: String(id) });
    return result.deletedCount > 0;
  }

  async getAllSystemVideos() {
    const db = await this.getDb();
    const docs = await db.collection('videos').find({}).toArray();
    return docs.map(d => this.mapDoc(d));
  }

  // --- Watch Time ---
  async getWatchTimeRecord(parentId, childId, dateString) {
    const db = await this.getDb();
    const doc = await db.collection('watchTimeRecords').findOne({
      childId: String(childId),
      dateString: String(dateString)
    });
    if (doc) {
      return this.mapDoc(doc);
    }
    // Default empty record for date
    const id = `wt_${childId}_${dateString}`;
    const newDoc = {
      _id: id,
      parentId: String(parentId),
      childId: String(childId),
      dateString: String(dateString),
      secondsWatched: 0,
      tempExtensionMinutes: 0,
      updatedAt: new Date().toISOString()
    };
    await db.collection('watchTimeRecords').insertOne(newDoc);
    return this.mapDoc(newDoc);
  }

  async incrementWatchTime(parentId, childId, secondsIncrement, dateString) {
    const db = await this.getDb();
    const inc = Math.max(0, Number(secondsIncrement) || 1);
    await this.getWatchTimeRecord(parentId, childId, dateString);
    await db.collection('watchTimeRecords').updateOne(
      { childId: String(childId), dateString: String(dateString) },
      {
        $inc: { secondsWatched: inc },
        $set: { updatedAt: new Date().toISOString() }
      }
    );
    return this.getWatchTimeRecord(parentId, childId, dateString);
  }

  async applyTemporaryExtension(parentId, childId, extensionMinutes, dateString) {
    const db = await this.getDb();
    const mins = Math.max(5, Number(extensionMinutes) || 15);
    await this.getWatchTimeRecord(parentId, childId, dateString);
    await db.collection('watchTimeRecords').updateOne(
      { childId: String(childId), dateString: String(dateString) },
      {
        $inc: { tempExtensionMinutes: mins },
        $set: { updatedAt: new Date().toISOString() }
      }
    );
    return this.getWatchTimeRecord(parentId, childId, dateString);
  }

  // --- PIN Attempts ---
  async getPinAttempts(parentId) {
    const db = await this.getDb();
    const doc = await db.collection('pinAttempts').findOne({ parentId: String(parentId) });
    if (!doc) {
      return { parentId: String(parentId), failedCount: 0, lockedUntil: 0 };
    }
    return {
      parentId: String(doc.parentId),
      failedCount: doc.failedCount || 0,
      lockedUntil: doc.lockedUntil || 0
    };
  }

  async recordFailedPinAttempt(parentId) {
    const db = await this.getDb();
    const current = await this.getPinAttempts(parentId);
    const newCount = (current.failedCount || 0) + 1;
    let lockedUntil = 0;
    if (newCount >= 3) {
      lockedUntil = Date.now() + (15 * 60 * 1000); // 15-minute lock
    }
    await db.collection('pinAttempts').updateOne(
      { parentId: String(parentId) },
      {
        $set: {
          parentId: String(parentId),
          failedCount: newCount,
          lockedUntil: lockedUntil,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );
    return { parentId: String(parentId), failedCount: newCount, lockedUntil };
  }

  async resetPinAttempts(parentId) {
    const db = await this.getDb();
    await db.collection('pinAttempts').deleteOne({ parentId: String(parentId) });
  }

  // --- Sessions ---
  async createSession(token, sessionData) {
    const db = await this.getDb();
    const doc = {
      _id: token,
      token,
      userId: String(sessionData.userId),
      username: sessionData.username,
      role: sessionData.role,
      parentId: sessionData.parentId ? String(sessionData.parentId) : null,
      childId: sessionData.childId ? String(sessionData.childId) : null,
      createdAt: Date.now()
    };
    await db.collection('sessions').updateOne(
      { _id: token },
      { $set: doc },
      { upsert: true }
    );
    return doc;
  }

  async getSession(token) {
    if (!token) return null;
    const db = await this.getDb();
    const doc = await db.collection('sessions').findOne({ token });
    return doc || null;
  }

  async deleteSession(token) {
    const db = await this.getDb();
    await db.collection('sessions').deleteOne({ token });
  }

  async deleteSessionsForParent(parentId) {
    const db = await this.getDb();
    await db.collection('sessions').deleteMany({
      $or: [{ parentId }, { userId: parentId }]
    });
  }

  async deleteSessionsForChild(childId) {
    const db = await this.getDb();
    await db.collection('sessions').deleteMany({
      $or: [{ childId }, { userId: childId }]
    });
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

const mongoInstance = new MongoDatabase();

module.exports = mongoInstance;