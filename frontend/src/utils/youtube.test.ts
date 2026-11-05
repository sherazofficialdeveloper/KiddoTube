import { buildYoutubePlayerHtml } from './youtube';
import { VideoCategory } from '../types/models';

describe('buildYoutubePlayerHtml', () => {
  it('uses a single app-controlled playback bar and exposes player controls', () => {
    const html = buildYoutubePlayerHtml('abcdefghijk');

    expect(html).toContain('controls=0');
    expect(html).toContain('disablekb=1');
    expect(html).toContain("playbackState.type = 'playback'");
    expect(html).toContain("playbackState.type = 'ended'");
    expect(html).toContain("window.setInterval(sendPlaybackState, 250)");
    expect(html).toContain('window.kiddoPlayerCommand');
  });

  it('honors caption and safe-volume preferences', () => {
    const html = buildYoutubePlayerHtml('abcdefghijk', {
      captionsEnabled: true,
      safeVolumeEnabled: true,
      safeVolumeLimitPercent: 55,
    });

    expect(html).toContain('cc_load_policy=1');
    expect(html).toContain('var safeVolumeEnabled = true');
    expect(html).toContain('var safeVolumeLimit = 55');
    expect(html).toContain('player.setVolume(safeVolumeLimit)');
    expect(html).toContain('player.setVolume(volumeBeforeSafeCap)');
    expect(html).not.toContain(
      'player.setVolume(safeVolumeLimit);\n          if (typeof player.pauseVideo'
    );
    expect(html).not.toContain('safeVolumeAlert');
    expect(html).toContain("player.loadModule('captions')");
    expect(html).toContain("player.unloadModule('captions')");
    expect(html).toContain("command === 'safeVolume'");
  });

  it('clamps offline playback without pausing or emitting safe-volume alerts', () => {
    const html = require('./youtube').buildOfflinePlayerHtml(
      {
        id: 'video-1',
        youtubeId: 'abcdefghijk',
        title: 'Test',
        channelTitle: 'Test',
        thumbnailUrl: '',
        durationText: '1:00',
        category: VideoCategory.ALL,
      },
      'file:///video.mp4',
      { safeVolumeEnabled: true, safeVolumeLimitPercent: 50 }
    );

    expect(html).toContain('video.volume = safeVolumeLimit');
    expect(html).not.toContain(
      'video.volume = safeVolumeLimit;\n          video.pause();'
    );
    expect(html).not.toContain('safeVolumeAlert');
  });

  it('can expose YouTube controls when parents preview an approved video', () => {
    const html = buildYoutubePlayerHtml('abcdefghijk', { controls: true });

    expect(html).toContain('controls=1');
    expect(html).toContain('disablekb=0');
    expect(html).toContain('fs=1');
    expect(html).toContain('controls: 1');
  });
});
