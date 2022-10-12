import {
  Drm,
  PlayerEventCallback,
  PlayerInterface,
  Quality,
} from '../PlayerInterface';
import 'videojs-contrib-quality-levels';
import 'videojs-contrib-eme';

import videojs from 'video.js';
import { timeout } from '../util';

const videoJsWrapperId = 'videoJsWrapper';

let initialized = false;

class VideoJsPlayer implements PlayerInterface {
  private player!: videojs.Player;
  private playerId: string = 'video_js_player';
  private eventCallback?: PlayerEventCallback;

  viewElement(): HTMLElement {
    const playerWrapper = document.createElement('div');
    playerWrapper.id = videoJsWrapperId;
    playerWrapper.style.width = '100%';
    playerWrapper.style.height = '100%';

    const videoElement = document.createElement('video');
    videoElement.id = this.playerId;
    videoElement.className = 'video-js vjs-default-skin';

    playerWrapper.replaceChildren(videoElement);

    playerWrapper.addEventListener('contextmenu', (event) =>
      event.preventDefault()
    );

    return playerWrapper;
  }

  async init(): Promise<void> {
    if (initialized) {
      return;
    }

    return await new Promise((resolve) => {
      this.playerId = '';
      this.player = videojs(this.playerId, {
        autoplay: true,
        autoSetup: true,
        fluid: true,
        aspectRatio: '16:9',
        children: ['MediaLoader', 'LiveTracker', 'ResizeManager'],
        html5: {
          vhs: { limitRenditionByPlayerDimensions: false },
        },
      });
      this.player.ready(() => {
        this.player.on('ended', () => {
          this.eventCallback?.({ key: this.playerId, type: 'completed' });
        });

        this.player.on('play', () => {
          this.eventCallback?.({ key: this.playerId, type: 'play' });
        });

        this.player.on('pause', () => {
          this.eventCallback?.({ key: this.playerId, type: 'pause' });
        });

        this.player.on('loadstart', () => {
          this.eventCallback?.({ key: this.playerId, type: 'bufferingStart' });
        });

        this.player.on('progress', () => {
          const buffered = this.player.buffered();
          const duration = this.player.duration();
          const bufferedRanges = Array(buffered?.length)
            .fill(0)
            .map((_, i) => ({
              start: buffered.start(i),
              end: buffered.end(i),
            }));
          if (bufferedRanges.length > 0) {
            if (bufferedRanges[buffered.length - 1].end === duration) {
              this.eventCallback?.({
                key: this.playerId,
                type: 'bufferingEnd',
              });
            } else {
              this.eventCallback?.({
                key: this.playerId,
                type: 'bufferingUpdate',
                buffered: bufferedRanges,
              });
            }
          }
        });

        this.player.on('loadedmetadata', () => {
          console.log(
            `VIDEO_JS: loadedmetadata duration: ${this.player.duration()} width: ${this.player.videoWidth()} height:  ${this.player.videoHeight()}`
          );

          this.eventCallback?.({
            key: this.playerId,
            type: 'initialized',
            duration: this.player.duration(),
            size: {
              width: this.player.videoWidth(),
              height: this.player.videoHeight(),
            },
          });
        });

        // @ts-expect-error
        this.player.eme();

        initialized = true;
        resolve();
      });
    });
  }

  async destroy(): Promise<void> {
    return this.player.dispose();
  }

  async setSrc(url: string, drm: Drm | undefined): Promise<void> {
    return await timeout(
      new Promise<void>((resolve) => {
        this.player.src({
          src: url,
          type: 'application/x-mpegURL', // TODO: figure out from source
          ...(drm !== undefined && {
            keySystems: this.getKeySystems(drm),
            emeHeaders: drm?.headers,
          }),
        });
        this.player.one('loadedmetadata', () => {
          console.log('VIDEO_JS: loadedmetadata on setSrc');
          resolve();
        });
      }),
      5000
    );
  }

  async pause(): Promise<void> {
    if (!this.player.paused()) {
      this.player.pause();
    }
  }

  async play(): Promise<void> {
    if (this.player.paused()) {
      return;
    }
    return await this.player.play();
  }

  async position(): Promise<number> {
    return this.player.currentTime();
  }

  async seekTo(position: number): Promise<void> {
    this.player.currentTime(position);
  }

  async setAudioTrack(index: number, _id: string): Promise<void> {
    const audioTrackList = this.player.audioTracks();

    if (audioTrackList.length <= 0) {
      return;
    }
    if (index < 0 || index > audioTrackList.length - 1) {
      return;
    }
    audioTrackList[index].enabled = true;
  }

  private getKeySystems(drm: Drm): Object {
    if (drm.type === 'widevine') {
      return { 'com.widevine.alpha': drm.data.licenseUrl };
    }

    if (drm.type === 'fairplay') {
      const fairPlayDrm = drm.data;

      return {
        'com.apple.fps.1_0': {
          certificateUri: fairPlayDrm.certificateUrl,
          getLicense: function (
            emeOptions: any,
            contentId: any,
            keyMessage: any,
            callback: any
          ) {
            // request key
            // if err, callback(err)
            // if success, callback(null, key) as arraybuffer
            const b64LicenseRequest = btoa(
              String.fromCharCode.apply(null, keyMessage)
            );
            const payload = {
              assetId: contentId,
              spc: b64LicenseRequest,
            };

            const parts = fairPlayDrm.licenseUrl.split('jwt=');
            if (parts.length !== 2) {
              console.error('missing jwt token in licence');
            }
            const token = parts[1];

            const headers = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            };
            videojs.xhr(
              {
                uri: fairPlayDrm.licenseUrl,
                method: 'POST',
                responseType: 'json',
                body: JSON.stringify(payload),
                headers,
              },
              function (error, resp, body) {
                if (error != null) {
                  callback(error);
                }
                const ckc = Uint8Array.from(atob(body.ckc), (c) =>
                  c.charCodeAt(0)
                );
                callback(null, ckc);
              }
            );
          },
        },
      };
    }

    if (drm.type === 'clearkey') {
      return { 'org.w3.clearkey': drm.data.licenseUrl };
    }

    console.error('not supported drm type');
    return {};
  }

  async getQualities(): Promise<Quality[]> {
    const qualityLevels = this.player.qualityLevels();
    return Array(qualityLevels.length)
      .fill(0)
      .map((_, i) => {
        const quality = qualityLevels[i];
        return {
          id: quality.id,
          width: quality.width,
          height: quality.height,
          bitrate: quality.bitrate,
        };
      });
  }

  async setQuality(
    bitrate?: number,
    width?: number,
    height?: number
  ): Promise<void> {
    const qualityLevels = this.player.qualityLevels();
    for (let index = 0; index < qualityLevels.length; ++index) {
      const quality = qualityLevels[index];
      quality.enabled =
        bitrate === undefined ||
        bitrate === 0 ||
        (quality.bitrate === bitrate &&
          (width != null ? quality.width === width : true) &&
          (height != null ? quality.height === height : true));
    }
  }

  async setVolume(volume: number): Promise<void> {
    this.player.volume(volume);
  }

  onEvent(listener: PlayerEventCallback): void {
    this.eventCallback = listener;
  }
}

export { VideoJsPlayer };
