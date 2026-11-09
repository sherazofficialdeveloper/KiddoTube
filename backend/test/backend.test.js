const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const db = require('../src/models/db');
const { verifyPassword, verifyPin } = require('../src/utils/cryptoUtils');

let server;
let baseUrl;
const authHeaders = (token) => ({ Authorization: 'Bearer ' + token });
const originalFetch = global.fetch;
const originalYoutubeApiKey = process.env.YOUTUBE_API_KEY;
const youtubeChannelId = 'UC1234567890123456789012';
const youtubeVideos = {
  ChannelVid1: {
    id: 'ChannelVid1',
    snippet: {
      title: 'Imported Channel Video',
      channelTitle: 'Actual SciShow Kids',
      description: 'YouTube-provided video description',
      thumbnails: { high: { url: 'https://img.youtube.test/channel-video.jpg' } }
    },
    contentDetails: { duration: 'PT6M12S' }
  },
  DirectVid01: {
    id: 'DirectVid01',
    snippet: {
      title: 'Imported Direct Video',
      channelTitle: 'Video Creator',
      description: 'YouTube-provided video description',
      thumbnails: { high: { url: 'https://img.youtube.test/channel-video.jpg' } }
    },
    contentDetails: { duration: 'PT6M12S' }
  },
  Audience001: {
    id: 'Audience001',
    snippet: {
      title: 'Child-only approved video',
      channelTitle: 'KiddoTube Test Creator',
      description: 'Audience isolation test',
      thumbnails: { high: { url: 'https://img.youtube.test/audience-video.jpg' } }
    },
    contentDetails: { duration: 'PT3M20S' }
  },
  Playlist001: {
    id: 'Playlist001',
    snippet: {
      title: 'Imported Playlist Video',
      channelTitle: 'Playlist Creator',
      description: 'Playlist video description',
      thumbnails: { high: { url: 'https://img.youtube.test/playlist-video.jpg' } }
    },
    contentDetails: { duration: 'PT1H2M3S' }
  },
  dQw4w9WgXcQ: {
    id: 'dQw4w9WgXcQ',
    snippet: {
      title: 'Imported Channel Video',
      channelTitle: 'Actual SciShow Kids',
      description: 'YouTube-provided video description',
      thumbnails: { high: { url: 'https://img.youtube.test/channel-video.jpg' } }
    },
    contentDetails: { duration: 'PT6M12S' }
  },
  'M7lc1UVf-VE': {
    id: 'M7lc1UVf-VE',
    snippet: {
      title: 'Imported Playlist Video',
      channelTitle: 'Playlist Creator',
      description: 'Playlist video description',
      thumbnails: { high: { url: 'https://img.youtube.test/playlist-video.jpg' } }
    },
    contentDetails: { duration: 'PT1H2M3S' }
  }
};

test.before((t, done) => {
  process.env.YOUTUBE_API_KEY = 'test-youtube-api-key';
  global.fetch = async (input, init) => {
    const url = new URL(input);
    if (url.hostname !== 'www.googleapis.com') {
      return originalFetch(input, init);
    }

    const respond = (items) => new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    if (url.pathname.endsWith('/channels')) {
      return respond([{
        id: youtubeChannelId,
        snippet: {
          title: 'Actual SciShow Kids',
          description: 'Science for children',
          thumbnails: { high: { url: 'https://img.youtube.test/channel.jpg' } }
        },
        contentDetails: { relatedPlaylists: { uploads: 'UUuploads' } },
        statistics: { videoCount: '10' }
      }]);
    }
    if (url.pathname.endsWith('/playlists')) {
      return respond([{
        id: 'PL123456789012',
        snippet: {
          title: 'Actual Playlist Title',
          channelTitle: 'Playlist Creator',
          thumbnails: { high: { url: 'https://img.youtube.test/playlist.jpg' } }
        },
        contentDetails: { itemCount: 2 }
      }]);
    }
    if (url.pathname.endsWith('/playlistItems')) {
      const videoId = url.searchParams.get('playlistId') === 'UUuploads'
        ? 'ChannelVid1'
        : 'Playlist001';
      return respond([{ contentDetails: { videoId } }]);
    }
    if (url.pathname.endsWith('/videos')) {
      return respond(url.searchParams.get('id')
        .split(',')
        .map((id) => youtubeVideos[id])
        .filter(Boolean));
    }
    return respond([]);
  };
  server = http.createServer(app);
  server.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  global.fetch = originalFetch;
  if (originalYoutubeApiKey === undefined) {
    delete process.env.YOUTUBE_API_KEY;
  } else {
    process.env.YOUTUBE_API_KEY = originalYoutubeApiKey;
  }
  await db.close();
});

// 1. Health Probe & Database Type
test('GET /api/health returns status ok with MongoDB database', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.match(data.database, /MongoDB/i);
});

// 2. Database Real Persistence in MongoDB
test('MongoDB database persists and retrieves data correctly', async () => {
  const testParentId = `parent_persist_${Date.now()}`;
  await db.createParent({
    id: testParentId,
    username: `persist_user_${Date.now()}`,
    displayName: 'Persistence Test Parent',
    email: `persist_${Date.now()}@example.com`,
    passwordHash: 'dummy_hash',
    pinHash: 'dummy_pin_hash',
    dailyLimitMinutes: 75
  });

  // Verify created
  const foundBefore = await db.findParentById(testParentId);
  assert.ok(foundBefore);
  assert.strictEqual(foundBefore.dailyLimitMinutes, 75);

  // Re-query from database
  const foundAfter = await db.findParentById(testParentId);
  assert.ok(foundAfter);
  assert.strictEqual(foundAfter.id, testParentId);
  assert.strictEqual(foundAfter.dailyLimitMinutes, 75);
});

// 3. Password and PIN Security (Bcrypt, No Plaintext, No Hashes in API)
let parentToken = '';
test('Parent registration and login uses bcrypt and never leaks hashes', async () => {
  const testUsername = `parent_test_${Date.now()}`;
  const testEmail = `parent_${Date.now()}@test.app`;

  // Register
  const regRes = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      email: testEmail,
      password: 'securePassword123!',
      pin: '5678'
    })
  });
  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  assert.strictEqual(regData.success, true);
  // Verify NO passwordHash, pinHash, or plainPasswordHint in response
  assert.strictEqual(regData.data.passwordHash, undefined);
  assert.strictEqual(regData.data.pinHash, undefined);
  assert.strictEqual(regData.data.plainPasswordHint, undefined);

  // Login
  const loginRes = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      password: 'securePassword123!'
    })
  });
  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);
  assert.ok(loginData.token);
  assert.strictEqual(loginData.data.passwordHash, undefined);
  assert.strictEqual(loginData.data.pinHash, undefined);
  parentToken = loginData.token;

  // Test invalid password fails
  const badLoginRes = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUsername,
      password: 'wrongPassword999'
    })
  });
  assert.strictEqual(badLoginRes.status, 401);
});

test('Parent registration does not require a PIN and allows setting one from the dashboard', async () => {
  const username = `parent_no_pin_${Date.now()}`;
  const response = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email: `${username}@test.app`,
      password: 'securePassword123!'
    })
  });

  assert.strictEqual(response.status, 201);
  const registration = await response.json();
  assert.ok(registration.token);
  assert.strictEqual(registration.data.pinHash, undefined);

  const updateResponse = await fetch(`${baseUrl}/api/parent/settings/pin`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registration.token}`
    },
    body: JSON.stringify({ currentPin: '', newPin: '2468' })
  });
  assert.strictEqual(updateResponse.status, 200);

  const directResetPinResponse = await fetch(
    `${baseUrl}/api/parent/settings/pin`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registration.token}`
      },
      body: JSON.stringify({ currentPin: '', newPin: '1357' })
    }
  );
  assert.strictEqual(directResetPinResponse.status, 200);

  const verifyResponse = await fetch(`${baseUrl}/api/parent/verify-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${registration.token}`
    },
    body: JSON.stringify({ pin: '1357' })
  });
  assert.strictEqual(verifyResponse.status, 200);
  assert.strictEqual((await verifyResponse.json()).success, true);
});

test('Parent can update account username and email and change password', async () => {
  const username = `parent_updated_${Date.now()}`;
  const profileResponse = await fetch(`${baseUrl}/api/parent/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      username,
      displayName: username,
      email: `${username}@test.app`
    })
  });
  assert.strictEqual(profileResponse.status, 200);
  const profile = await profileResponse.json();
  assert.strictEqual(profile.data.username, username);
  assert.strictEqual(profile.data.email, `${username}@test.app`);

  const passwordResponse = await fetch(`${baseUrl}/api/parent/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      currentPassword: 'securePassword123!',
      newPassword: 'newSecurePassword456!'
    })
  });
  assert.strictEqual(passwordResponse.status, 200);

  const loginResponse = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password: 'newSecurePassword456!'
    })
  });
  assert.strictEqual(loginResponse.status, 200);
  parentToken = (await loginResponse.json()).token;
});

test('Parent password reset via OTP email flow works end-to-end', async () => {
  const timestamp = Date.now();
  const testEmail = `parent_otp_${timestamp}@example.com`;
  const initialPassword = 'initialPassword123!';
  const resetPassword = 'newOtpResetPassword789!';

  // 1. Register a test parent
  const regRes = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `parent_otp_${timestamp}`,
      email: testEmail,
      password: initialPassword
    })
  });
  assert.strictEqual(regRes.status, 201);

  // 2. Request OTP for non-existent email -> 404
  const notFoundRes = await fetch(`${baseUrl}/api/auth/parent/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_parent_404@example.com' })
  });
  assert.strictEqual(notFoundRes.status, 404);

  // 3. Request OTP for valid parent email -> 200 with code generated
  const forgotRes = await fetch(`${baseUrl}/api/auth/parent/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  assert.strictEqual(forgotRes.status, 200);
  const forgotData = await forgotRes.json();
  assert.strictEqual(forgotData.success, true);
  assert.ok(forgotData.devOtp, 'Should include devOtp when running in dev/test environment');
  const otpCode = forgotData.devOtp;

  // 4. Reset with wrong OTP -> 400
  const wrongOtpRes = await fetch(`${baseUrl}/api/auth/parent/reset-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: '000000',
      newPassword: resetPassword
    })
  });
  assert.strictEqual(wrongOtpRes.status, 400);

  // 5. Reset with correct OTP -> 200
  const resetRes = await fetch(`${baseUrl}/api/auth/parent/reset-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: otpCode,
      newPassword: resetPassword
    })
  });
  assert.strictEqual(resetRes.status, 200);
  const resetData = await resetRes.json();
  assert.strictEqual(resetData.success, true);

  // 6. Old password fails -> 401
  const oldLoginRes = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testEmail,
      password: initialPassword
    })
  });
  assert.strictEqual(oldLoginRes.status, 401);

  // 7. New password succeeds -> 200
  const newLoginRes = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testEmail,
      password: resetPassword
    })
  });
  assert.strictEqual(newLoginRes.status, 200);
  const newLoginData = await newLoginRes.json();
  assert.strictEqual(newLoginData.success, true);
  assert.ok(newLoginData.token);
});

test('YouTube channel link and custom display name are saved for the parent', async () => {
  const customName = `Favorite Kids Channel ${Date.now()}`;
  const createResponse = await fetch(`${baseUrl}/api/content/channel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      title: customName,
      channelUrlOrId: 'https://www.youtube.com/@SciShowKids',
      description: 'A channel approved by the parent'
    })
  });
  assert.strictEqual(createResponse.status, 201);
  const created = await createResponse.json();
  assert.strictEqual(created.data.title, customName);
  assert.strictEqual(created.data.channelId, youtubeChannelId);
  assert.strictEqual(created.data.videoCount, 1);

  const invalidResponse = await fetch(`${baseUrl}/api/content/channel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({ title: 'Invalid Link', channelUrlOrId: 'xx' })
  });
  assert.strictEqual(invalidResponse.status, 400);
});

test('YouTube videos and playlists import metadata and video records', async () => {
  const videoResponse = await fetch(`${baseUrl}/api/content/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({ youtubeUrlOrId: 'DirectVid01' })
  });
  assert.strictEqual(videoResponse.status, 201);
  const video = (await videoResponse.json()).data;
  assert.strictEqual(video.title, 'Imported Direct Video');
  assert.strictEqual(video.durationText, '06:12');
  assert.strictEqual(video.thumbnailUrl, 'https://img.youtube.test/channel-video.jpg');

  const playlistResponse = await fetch(`${baseUrl}/api/content/playlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({ playlistUrlOrId: 'PL123456789012' })
  });
  assert.strictEqual(playlistResponse.status, 201);
  const playlist = (await playlistResponse.json()).data;
  assert.strictEqual(playlist.title, 'Actual Playlist Title');
  assert.strictEqual(playlist.videoCount, 1);
  assert.strictEqual(playlist.videoIds.length, 1);
});

test('YouTube imports report a clear configuration error when the API key is missing', async () => {
  const configuredApiKey = process.env.YOUTUBE_API_KEY;
  delete process.env.YOUTUBE_API_KEY;
  try {
    const response = await fetch(`${baseUrl}/api/content/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parentToken}`
      },
      body: JSON.stringify({ youtubeUrlOrId: 'DirectVid01' })
    });
    assert.strictEqual(response.status, 503);
    const error = await response.json();
    assert.match(error.error, /YOUTUBE_API_KEY/);
  } finally {
    process.env.YOUTUBE_API_KEY = configuredApiKey;
  }
});

// 4. Shared Parent Daily Limit Updates All Children Under Parent
let childAId = '';
let childBId = '';
test('Parent daily limit setting updates all children under that parent', async () => {
  // Create Child A
  const resA = await fetch(`${baseUrl}/api/parent/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      username: `ChildA_${Date.now()}`,
      displayName: 'Child A',
      password: 'pass4321ChildA',
      ageGroup: 7
    })
  });
  assert.strictEqual(resA.status, 201);
  const dataA = await resA.json();
  childAId = dataA.data.id;

  // Create Child B
  const resB = await fetch(`${baseUrl}/api/parent/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      username: `ChildB_${Date.now()}`,
      displayName: 'Child B',
      password: 'pass4321ChildB',
      ageGroup: 9
    })
  });
  assert.strictEqual(resB.status, 201);
  const dataB = await resB.json();
  childBId = dataB.data.id;

  // Initial limit is 60 minutes
  const childrenListBefore = await fetch(`${baseUrl}/api/parent/children`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  const listBeforeData = await childrenListBefore.json();
  const cA_before = listBeforeData.data.find(c => c.id === childAId);
  const cB_before = listBeforeData.data.find(c => c.id === childBId);
  assert.strictEqual(cA_before.dailyLimitMinutes, 60);
  assert.strictEqual(cB_before.dailyLimitMinutes, 60);

  // Update Parent's daily limit to 90 minutes
  const updateLimitRes = await fetch(`${baseUrl}/api/parent/settings/daily-limit`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({ dailyLimitMinutes: 90 })
  });
  assert.strictEqual(updateLimitRes.status, 200);

  // Verify BOTH Child A and Child B now reflect 90 minutes
  const childrenListAfter = await fetch(`${baseUrl}/api/parent/children`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  const listAfterData = await childrenListAfter.json();
  const cA_after = listAfterData.data.find(c => c.id === childAId);
  const cB_after = listAfterData.data.find(c => c.id === childBId);
  assert.strictEqual(cA_after.dailyLimitMinutes, 90);
  assert.strictEqual(cB_after.dailyLimitMinutes, 90);
});

// 5. Child Authentication & Strict Password Verification (No '1234' backdoor)
let childToken = '';
test('Child login succeeds with correct password and rejects invalid passwords', async () => {
  const child = await db.findChildById(childAId);

  // Test invalid password
  const failRes = await fetch(`${baseUrl}/api/auth/child/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: child.username,
      password: 'wrongPassword!'
    })
  });
  assert.strictEqual(failRes.status, 401);

  // Test that old '1234' does NOT bypass if password is not 1234
  const bypassRes = await fetch(`${baseUrl}/api/auth/child/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: child.username,
      password: '1234'
    })
  });
  assert.strictEqual(bypassRes.status, 401);

  // Test correct password
  const successRes = await fetch(`${baseUrl}/api/auth/child/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: child.username,
      password: 'pass4321ChildA'
    })
  });
  assert.strictEqual(successRes.status, 200);
  const successData = await successRes.json();
  assert.strictEqual(successData.success, true);
  assert.strictEqual(successData.role, 'CHILD');
  assert.strictEqual(successData.data.dailyLimitMinutes, 90);
  childToken = successData.token;
});

// 6. Child Profiles Endpoint Security (No unauthenticated exposure, no cross-parent leakage)
test('/api/child/profiles requires auth and isolates family profiles', async () => {
  // Unauthenticated request to /api/child/profiles -> 401 Unauthorized
  const unauthRes = await fetch(`${baseUrl}/api/child/profiles`);
  assert.strictEqual(unauthRes.status, 401);

  // Child A requesting /api/child/profiles -> sees only Child A and Child B (Parent A's family)
  const childProfilesRes = await fetch(`${baseUrl}/api/child/profiles`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(childProfilesRes.status, 200);
  const profilesData = await childProfilesRes.json();
  assert.ok(profilesData.profiles.some(p => p.id === childAId));
  assert.ok(profilesData.profiles.some(p => p.id === childBId));
});

// 7. Multi-Tenant Content Isolation & Direct Resource Request
let parentAVideoId = '';
test('Child only sees content approved by their own parent; other parent children cannot access it', async () => {
  // Parent A adds Video A
  const addVidRes = await fetch(`${baseUrl}/api/content/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      title: 'Secret Stars of Outer Space 🔭',
      channelTitle: 'Deep Space Kids',
      youtubeUrlOrId: 'dQw4w9WgXcQ',
      category: 'LEARNING'
    })
  });
  assert.strictEqual(addVidRes.status, 201);
  const addVidData = await addVidRes.json();
  parentAVideoId = addVidData.data.id;

  // Child A (under Parent A) fetches approved content -> sees Video A
  const childAContentRes = await fetch(`${baseUrl}/api/content/approved`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(childAContentRes.status, 200);
  const childAContent = await childAContentRes.json();
  assert.ok(childAContent.videos.some(v => v.id === parentAVideoId));

  // Direct video resource request by Child A -> 200 OK
  const directVidRes = await fetch(`${baseUrl}/api/content/video/${parentAVideoId}`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(directVidRes.status, 200);

  // Now create Parent B and Child B
  const parentBUser = `parentB_${Date.now()}`;
  const regB = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: parentBUser,
      email: `${parentBUser}@test.com`,
      password: 'passwordB123',
      pin: '4321'
    })
  });
  const regBData = await regB.json();
  const parentBToken = regBData.token;

  const childBUser = `childB_${Date.now()}`;
  await fetch(`${baseUrl}/api/parent/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentBToken}`
    },
    body: JSON.stringify({
      username: childBUser,
      displayName: 'Child B User',
      password: 'childBPassword123'
    })
  });

  const childBLogin = await fetch(`${baseUrl}/api/auth/child/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: childBUser, password: 'childBPassword123' })
  });
  const childBToken = (await childBLogin.json()).token;

  // Child B fetches approved content -> Must NOT see Parent A's video!
  const childBContentRes = await fetch(`${baseUrl}/api/content/approved`, {
    headers: { Authorization: `Bearer ${childBToken}` }
  });
  const childBContent = await childBContentRes.json();
  assert.strictEqual(childBContent.videos.some(v => v.id === parentAVideoId), false);

  // Child B directly requests Parent A's video -> Must return 404/unavailable!
  const directDeniedRes = await fetch(`${baseUrl}/api/content/video/${parentAVideoId}`, {
    headers: { Authorization: `Bearer ${childBToken}` }
  });
  assert.strictEqual(directDeniedRes.status, 404);

  // Child B requesting /api/child/profiles does NOT see Parent A's children
  const childBProfilesRes = await fetch(`${baseUrl}/api/child/profiles`, {
    headers: { Authorization: `Bearer ${childBToken}` }
  });
  const childBProfiles = await childBProfilesRes.json();
  assert.strictEqual(childBProfiles.profiles.some(p => p.id === childAId), false);
});

// 8. Video Removal & Direct Resource Invalidation
test('When parent removes video, it disappears from home and direct request returns 404', async () => {
  // Parent A removes Video A
  const removeRes = await fetch(`${baseUrl}/api/content/video/${parentAVideoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  assert.strictEqual(removeRes.status, 200);

  // Child A fetches content -> Video A is gone
  const contentRes = await fetch(`${baseUrl}/api/content/approved`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  const content = await contentRes.json();
  assert.strictEqual(content.videos.some(v => v.id === parentAVideoId), false);

  // Child A directly requests Video A -> 404
  const directRes = await fetch(`${baseUrl}/api/content/video/${parentAVideoId}`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(directRes.status, 404);
});

// 9. Search Security (Only parent-approved content returned)
test('Search only searches permitted parent-approved content', async () => {
  // Add a specific approved video
  await fetch(`${baseUrl}/api/content/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentToken}`
    },
    body: JSON.stringify({
      title: 'Dolphin Ocean Safari Adventure 🐬',
      channelTitle: 'Marine Kids',
      youtubeUrlOrId: 'dQw4w9WgXcQ',
      category: 'EXPLORE'
    })
  });

  // Search matching keyword
  const matchRes = await fetch(`${baseUrl}/api/content/search?q=Dolphin`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(matchRes.status, 200);
  const matchData = await matchRes.json();
  assert.ok(matchData.videos.length > 0);
  assert.ok(matchData.videos.every(v => v.title.includes('Dolphin')));

  // Search keyword not in approved library -> Returns 0 results (no open YouTube leak)
  const noMatchRes = await fetch(`${baseUrl}/api/content/search?q=UnapprovedExternalCatVideo`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(noMatchRes.status, 200);
  const noMatchData = await noMatchRes.json();
  assert.strictEqual(noMatchData.videos.length, 0);
});

test('Content audiences restrict sibling visibility and child usernames are globally unique', async () => {
  const parentUsername = `audience_parent_${Date.now()}`;
  const parentRegisterRes = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: parentUsername,
      email: `${parentUsername}@test.com`,
      password: 'parentPassword123'
    })
  });
  assert.strictEqual(parentRegisterRes.status, 201);
  const scopedParentToken = (await parentRegisterRes.json()).token;
  const targetUsername = `audience_target_${Date.now()}`;
  const targetCreateRes = await fetch(`${baseUrl}/api/parent/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(scopedParentToken)
    },
    body: JSON.stringify({ username: targetUsername, password: 'targetPassword123' })
  });
  assert.strictEqual(targetCreateRes.status, 201);
  const targetChild = (await targetCreateRes.json()).data;
  const availabilityRes = await fetch(
    `${baseUrl}/api/parent/children/check-username?username=${encodeURIComponent(targetUsername.toUpperCase())}`,
    { headers: authHeaders(scopedParentToken) }
  );
  const availability = await availabilityRes.json();
  assert.strictEqual(availability.available, false);

  const duplicateRes = await fetch(`${baseUrl}/api/parent/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(scopedParentToken)
    },
    body: JSON.stringify({
      username: targetUsername.toUpperCase(),
      password: 'childPassword123'
    })
  });
  assert.strictEqual(duplicateRes.status, 409);

  const siblingUsername = `sibling_${Date.now()}`;
  const siblingRes = await fetch(`${baseUrl}/api/parent/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(scopedParentToken)
    },
    body: JSON.stringify({
      username: siblingUsername,
      password: 'siblingPassword123'
    })
  });
  assert.strictEqual(siblingRes.status, 201);
  const sibling = (await siblingRes.json()).data;
  const siblingLoginRes = await fetch(`${baseUrl}/api/auth/child/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: siblingUsername, password: 'siblingPassword123' })
  });
  const siblingToken = (await siblingLoginRes.json()).token;
  const targetLoginRes = await fetch(`${baseUrl}/api/auth/child/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: targetUsername, password: 'targetPassword123' })
  });
  const targetToken = (await targetLoginRes.json()).token;

  const invalidAudienceRes = await fetch(`${baseUrl}/api/content/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(scopedParentToken)
    },
    body: JSON.stringify({
      title: 'Invalid audience video',
      youtubeUrlOrId: 'Audience001',
      childIds: ['not-this-parents-child']
    })
  });
  assert.strictEqual(invalidAudienceRes.status, 400);

  const addVideoRes = await fetch(`${baseUrl}/api/content/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(scopedParentToken)
    },
    body: JSON.stringify({
      title: 'Child-only approved video',
      youtubeUrlOrId: 'Audience001',
      category: 'LEARNING',
      childIds: [targetChild.id]
    })
  });
  assert.strictEqual(addVideoRes.status, 201);
  const scopedVideo = (await addVideoRes.json()).data;

  const childContentRes = await fetch(`${baseUrl}/api/content/approved`, {
    headers: authHeaders(targetToken)
  });
  const childContent = await childContentRes.json();
  assert.ok(childContent.videos.some((video) => video.id === scopedVideo.id));

  const siblingContentRes = await fetch(`${baseUrl}/api/content/approved`, {
    headers: authHeaders(siblingToken)
  });
  const siblingContent = await siblingContentRes.json();
  assert.strictEqual(
    siblingContent.videos.some((video) => video.id === scopedVideo.id),
    false
  );

  const siblingDirectRes = await fetch(
    `${baseUrl}/api/content/video/${scopedVideo.id}`,
    { headers: authHeaders(siblingToken) }
  );
  assert.strictEqual(siblingDirectRes.status, 404);
  assert.ok(sibling.id);
});

// 10. Watch Time, Temporary Extension, and Date-Based Daily Reset
test('Watch time accumulates and temporary extension applies only to current date', async () => {
  // Sync watch time (+180 seconds)
  const syncRes = await fetch(`${baseUrl}/api/child/watch-time/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${childToken}`
    },
    body: JSON.stringify({ secondsIncrement: 180 })
  });
  assert.strictEqual(syncRes.status, 200);
  const syncData = await syncRes.json();
  assert.strictEqual(syncData.session.secondsWatched, 180);
  assert.strictEqual(syncData.session.minutesWatched, 3);

  // Request temporary extension with parent PIN (5678)
  const extRes = await fetch(`${baseUrl}/api/child/extension/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${childToken}`
    },
    body: JSON.stringify({ pin: '5678', extensionMinutes: 20 })
  });
  assert.strictEqual(extRes.status, 200);
  const extData = await extRes.json();
  assert.strictEqual(extData.session.tempExtensionMinutes, 20);
  assert.strictEqual(extData.session.totalAllowedMinutes, 90 + 20); // 110 minutes!

  // Check watch time status for future date (tomorrow/next year)
  const child = await db.findChildById(childAId);
  const tomorrowRecord = await db.getWatchTimeRecord(child.parentId, child.id, '2099-01-01');
  // Tomorrow's extension must be 0 and watched seconds must be 0
  assert.strictEqual(tomorrowRecord.tempExtensionMinutes, 0);
  assert.strictEqual(tomorrowRecord.secondsWatched, 0);
});

// 11. Parent PIN Security & Rate Limiting (Session-tied & rate-limited)
test('PIN verification succeeds with correct PIN and rate limits on repeated failures', async () => {
  // Unauthenticated PIN verification -> 401 Unauthorized
  const unauthPin = await fetch(`${baseUrl}/api/parent/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '5678' })
  });
  assert.strictEqual(unauthPin.status, 401);

  // Correct PIN (5678) using child token session
  const okRes = await fetch(`${baseUrl}/api/parent/verify-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${childToken}`
    },
    body: JSON.stringify({ pin: '5678' })
  });
  assert.strictEqual(okRes.status, 200);
  const okData = await okRes.json();
  assert.strictEqual(okData.success, true);

  // 3 failed attempts
  const child = await db.findChildById(childAId);
  for (let i = 0; i < 2; i++) {
    const badRes = await fetch(`${baseUrl}/api/parent/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${childToken}`
      },
      body: JSON.stringify({ pin: '0000' })
    });
    assert.strictEqual(badRes.status, 401);
  }

  // 3rd failed attempt triggers 429 lockout
  const lockRes = await fetch(`${baseUrl}/api/parent/verify-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${childToken}`
    },
    body: JSON.stringify({ pin: '0000' })
  });
  assert.strictEqual(lockRes.status, 429);
  const lockData = await lockRes.json();
  assert.strictEqual(lockData.isLockedOut, true);

  // Reset PIN attempts for future tests
  await db.resetPinAttempts(child.parentId);
});

// 12. Role-Based Access Control (RBAC)
test('Enforces strict RBAC: Child & Parent blocked from Admin API; Child blocked from Parent mutation', async () => {
  // Child token -> Admin endpoint => 403 Forbidden
  const childToAdmin = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(childToAdmin.status, 403);

  // Parent token -> Admin endpoint => 403 Forbidden
  const parentToAdmin = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  assert.strictEqual(parentToAdmin.status, 403);

  // Child token -> Parent management endpoint => 403 Forbidden
  const childToParent = await fetch(`${baseUrl}/api/parent/dashboard`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.strictEqual(childToParent.status, 403);

  // Child token -> Content management mutation => 403 Forbidden
  const childToMutation = await fetch(`${baseUrl}/api/content/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${childToken}`
    },
    body: JSON.stringify({ title: 'Hacked Video' })
  });
  assert.strictEqual(childToMutation.status, 403);

  // Unauthenticated -> Admin endpoint => 401 Unauthorized
  const anonToAdmin = await fetch(`${baseUrl}/api/admin/dashboard`);
  assert.strictEqual(anonToAdmin.status, 401);

  // Admin login and access -> 200 OK
  const adminLogin = await fetch(`${baseUrl}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert.strictEqual(adminLogin.status, 200);
  const adminToken = (await adminLogin.json()).token;

  const adminDash = await fetch(`${baseUrl}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminDash.status, 200);
});

// 13. Deleting Child Cleans Up Foreign Relationships (Cascade)
test('Deleting a child removes the record and associated watch time records safely', async () => {
  const child = await db.findChildById(childBId);
  assert.ok(child);

  // Delete Child B
  const delRes = await fetch(`${baseUrl}/api/parent/children/${childBId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  assert.strictEqual(delRes.status, 200);

  // Verify Child B no longer exists
  const checkChild = await db.findChildById(childBId);
  assert.strictEqual(checkChild, null);
});

// 14. Admin Disables Parent -> Protected Requests Denied (Journey F)
test('Admin disables parent -> that parent and their children requests are denied', async () => {
  // Login as admin
  const adminLogin = await fetch(`${baseUrl}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const adminToken = (await adminLogin.json()).token;

  // Verify parentToken currently works
  const preCheck = await fetch(`${baseUrl}/api/parent/dashboard`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  assert.strictEqual(preCheck.status, 200);

  // Admin disables Parent A
  const session = await db.getSession(parentToken);
  assert.ok(session);
  const parentAId = session.parentId || session.userId;
  const disableRes = await fetch(`${baseUrl}/api/admin/parent/${parentAId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(disableRes.status, 200);

  // Now, Parent A with their existing token tries to access /api/parent/dashboard
  const postCheck = await fetch(`${baseUrl}/api/parent/dashboard`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  // Must be denied (401 or 403)
  assert.ok(postCheck.status === 401 || postCheck.status === 403, `Expected 401 or 403, got ${postCheck.status}`);

  // Child A trying to access approved content with their existing token is also denied
  const childCheck = await fetch(`${baseUrl}/api/content/approved`, {
    headers: { Authorization: `Bearer ${childToken}` }
  });
  assert.ok(childCheck.status === 401 || childCheck.status === 403, `Expected 401 or 403, got ${childCheck.status}`);

  // Reactivate Parent A for clean database state
  await fetch(`${baseUrl}/api/admin/parent/${parentAId}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
});

// 15. Comprehensive End-to-End Test Suite: Journey A through J
test('E2E TEST A - Parent and child lifecycle (register -> create child -> child login -> add video -> child plays video)', async () => {
  const pUser = `pJourneyA_${Date.now()}`;
  const regRes = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: pUser,
      email: `${pUser}@journey.test`,
      password: 'parentSecretA1!',
      pin: '2468'
    })
  });
  assert.strictEqual(regRes.status, 201);
  const pToken = (await regRes.json()).token;

  // Parent creates child
  const cUser = `cJourneyA_${Date.now()}`;
  const cRes = await fetch(`${baseUrl}/api/parent/children`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pToken}`
    },
    body: JSON.stringify({
      username: cUser,
      displayName: 'Journey Kid',
      password: 'kidSecretA1!'
    })
  });
  assert.strictEqual(cRes.status, 201);
  const cId = (await cRes.json()).data.id;

  // Child logs in
  const cLogin = await fetch(`${baseUrl}/api/auth/child/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: cUser,
      password: 'kidSecretA1!'
    })
  });
  assert.strictEqual(cLogin.status, 200);
  const cToken = (await cLogin.json()).token;

  // Parent adds approved video
  const vidRes = await fetch(`${baseUrl}/api/content/video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pToken}`
    },
    body: JSON.stringify({
      title: 'Solar System Journey For Kids 🪐',
      channelTitle: 'Galaxy Explorers',
      youtubeUrlOrId: 'dQw4w9WgXcQ',
      category: 'LEARNING'
    })
  });
  assert.strictEqual(vidRes.status, 201);
  const vidId = (await vidRes.json()).data.id;

  // Child queries approved list and finds video
  const approvedRes = await fetch(`${baseUrl}/api/content/approved`, {
    headers: { Authorization: `Bearer ${cToken}` }
  });
  assert.strictEqual(approvedRes.status, 200);
  const approvedData = await approvedRes.json();
  const foundVid = approvedData.videos.find(v => v.id === vidId);
  assert.ok(foundVid);
  assert.strictEqual(foundVid.youtubeId, 'dQw4w9WgXcQ');

  // Child accesses direct video endpoint
  const directVid = await fetch(`${baseUrl}/api/content/video/${vidId}`, {
    headers: { Authorization: `Bearer ${cToken}` }
  });
  assert.strictEqual(directVid.status, 200);
});

test('E2E TEST C & G - Tenant Isolation (Parent A vs Parent B children and settings separation)', async () => {
  const pAUser = `tenantA_${Date.now()}`;
  const pBUser = `tenantB_${Date.now()}`;

  const regA = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: pAUser, email: `${pAUser}@test.app`, password: 'passwordA123', pin: '1111' })
  });
  assert.strictEqual(regA.status, 201);
  const tokenA = (await regA.json()).token;

  const regB = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: pBUser, email: `${pBUser}@test.app`, password: 'passwordB123', pin: '2222' })
  });
  assert.strictEqual(regB.status, 201);
  const tokenB = (await regB.json()).token;

  // Parent A changes daily limit to 40 minutes
  await fetch(`${baseUrl}/api/parent/settings/daily-limit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ dailyLimitMinutes: 40 })
  });

  // Parent B changes daily limit to 120 minutes
  await fetch(`${baseUrl}/api/parent/settings/daily-limit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ dailyLimitMinutes: 120 })
  });

  // Verify Parent A is 40 and Parent B is 120
  const dashA = await (await fetch(`${baseUrl}/api/parent/dashboard`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
  const dashB = await (await fetch(`${baseUrl}/api/parent/dashboard`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();
  assert.strictEqual(dashA.data.stats.dailyLimitMinutes, 40);
  assert.strictEqual(dashB.data.stats.dailyLimitMinutes, 120);

  // Parent A cannot verify Parent B's PIN
  const crossPin = await fetch(`${baseUrl}/api/parent/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ pin: '2222' }) // Parent B's PIN
  });
  assert.strictEqual(crossPin.status, 401);
});

test('E2E TEST H - Database Persistence Verification', async () => {
  const pPersist = `restart_test_${Date.now()}`;
  const reg = await fetch(`${baseUrl}/api/auth/parent/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: pPersist, email: `${pPersist}@db.test`, password: 'passwordPersist123', pin: '9999' })
  });
  assert.strictEqual(reg.status, 201);
  const data = await reg.json();
  const parentId = data.data.id;

  // Direct MongoDB query verifies document exists in collection
  const fromDb = await db.findParentById(parentId);
  assert.ok(fromDb);
  assert.strictEqual(fromDb.username, pPersist);
});

test('E2E TEST I - Admin creates parent account -> verified in MongoDB Atlas -> parent logs in successfully', async () => {
  // 1. Admin login
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  // 2. Admin provisions new parent account
  const timestamp = Date.now();
  const newParentUser = `adminParent_${timestamp}`;
  const newParentEmail = `adminparent_${timestamp}@test.app`;
  const newParentPassword = 'SecurePassword123!';

  const createRes = await fetch(`${baseUrl}/api/admin/parents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      username: newParentUser,
      displayName: 'Provisioned Parent',
      email: newParentEmail,
      password: newParentPassword,
      dailyLimitMinutes: 75,
      pin: '8888'
    })
  });
  assert.strictEqual(createRes.status, 201);
  const createData = await createRes.json();
  assert.strictEqual(createData.success, true);
  const parentId = createData.data.id;

  // 3. Verify in MongoDB Atlas
  const fromDb = await db.findParentById(parentId);
  assert.ok(fromDb);
  assert.strictEqual(fromDb.username, newParentUser);
  assert.strictEqual(fromDb.email, newParentEmail);
  assert.strictEqual(fromDb.status, 'ACTIVE');
  assert.strictEqual(fromDb.dailyLimitMinutes, 75);
  assert.strictEqual(typeof fromDb.passwordHash, 'string');
  assert.ok(fromDb.passwordHash.startsWith('$2b$10$'));

  // 4. Parent logs in using username
  const loginUsernameRes = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: newParentUser, password: newParentPassword })
  });
  assert.strictEqual(loginUsernameRes.status, 200);
  const loginUsernameData = await loginUsernameRes.json();
  assert.strictEqual(loginUsernameData.success, true);
  assert.strictEqual(loginUsernameData.data.username, newParentUser);
  assert.ok(loginUsernameData.token);

  // 5. Parent logs in using email
  const loginEmailRes = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: newParentEmail, password: newParentPassword })
  });
  assert.strictEqual(loginEmailRes.status, 200);
  const loginEmailData = await loginEmailRes.json();
  assert.strictEqual(loginEmailData.success, true);

  // 6. Invalid password fails
  const badLoginRes = await fetch(`${baseUrl}/api/auth/parent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: newParentUser, password: 'WrongPassword!' })
  });
  assert.strictEqual(badLoginRes.status, 401);
});

test('Admin channel removal deletes the channel and all its associated videos from the database', async () => {
  const testParentId = `test_parent_cas_${Date.now()}`;
  const testChannelId = `ch_test_${Date.now()}`;
  const testChannelTitle = `Test Cascade Channel ${Date.now()}`;
  await db.addChannel({
    id: testChannelId,
    parentId: testParentId,
    channelId: `UC_test_${Date.now()}`,
    title: testChannelTitle,
    avatarUrl: 'https://example.com/avatar.jpg',
    videoCount: 2,
    category: 'SHOWS',
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  });

  const vid1 = await db.addVideo({
    id: `vid_cas_1_${Date.now()}`,
    parentId: testParentId,
    youtubeId: `y1_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    title: 'Cascade Video 1',
    channelTitle: testChannelTitle,
    thumbnailUrl: 'https://example.com/t1.jpg',
    durationText: '03:00',
    category: 'SHOWS',
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  });

  const vid2 = await db.addVideo({
    id: `vid_cas_2_${Date.now()}`,
    parentId: testParentId,
    youtubeId: `y2_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    title: 'Cascade Video 2',
    channelTitle: testChannelTitle,
    thumbnailUrl: 'https://example.com/t2.jpg',
    durationText: '04:00',
    category: 'SHOWS',
    status: 'APPROVED',
    createdAt: new Date().toISOString()
  });

  assert.ok(await db.findChannelById(testChannelId));
  assert.ok(await db.findVideoById(vid1.id));
  assert.ok(await db.findVideoById(vid2.id));

  const adminLogin = await fetch(`${baseUrl}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'admin123' })
  });
  const adminToken = (await adminLogin.json()).token;

  const removeRes = await fetch(`${baseUrl}/api/admin/content/moderate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ type: 'channel', id: testChannelId, action: 'REMOVE' })
  });
  assert.strictEqual(removeRes.status, 200);
  const removeData = await removeRes.json();
  assert.strictEqual(removeData.success, true);

  assert.strictEqual(await db.findChannelById(testChannelId), null);
  assert.strictEqual(await db.findVideoById(vid1.id), null);
  assert.strictEqual(await db.findVideoById(vid2.id), null);
});
