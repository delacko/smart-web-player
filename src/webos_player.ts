import {
  Drm,
  PlayerEventCallback,
  PlayerInterface,
  Quality,
} from './PlayerInterface';

let webosPlayerInitialized = false;

class WebOsPlayer implements PlayerInterface {
  private player?: HTMLVideoElement;
  // private source? : HTMLSourceElement
  private isPaused: boolean = false;
  private readonly debug: boolean = true;
  private buffered: number = 0;
  private duration: number = 0;
  private videoWidth: number = 0;
  private videoHeight: number = 0;
  private readonly playerId: string = 'webos_player';
  private eventCallback?: PlayerEventCallback;

  isInitialized(): boolean {
    return webosPlayerInitialized;
  }

  viewElement(): HTMLElement {
    const playerWrapper = document.getElementById(
      'videoPlaceholder'
    ) as HTMLElement;

    if (webosPlayerInitialized) {
      return playerWrapper;
    }

    // playerWrapper.id = videoJsWrapperId;
    playerWrapper.style.width = '100%';
    playerWrapper.style.height = '100%';

    const videoElement = document.createElement('video');
    videoElement.id = this.playerId;

    playerWrapper.replaceChildren(videoElement);

    playerWrapper.addEventListener('contextmenu', (event) =>
      event.preventDefault()
    );
    // add to dom

    return playerWrapper;
  }

  async init(): Promise<void> {
    if (webosPlayerInitialized) {
      return;
    }

    if (document.getElementById(this.playerId) instanceof HTMLVideoElement) {
      this.player = document.getElementById(this.playerId) as HTMLVideoElement;
    }

    // Add a new source element
    webosPlayerInitialized = true;
    this.addPlayerListeners();
  }

  addPlayerListeners(): void {
    if (this.player == null) {
      return;
    }

    this.player.addEventListener('play', (event) => {
      console.log(event);
      this.eventCallback?.({ key: this.playerId, type: 'play' });
    });
    this.player.addEventListener('ended', () => {
      this.eventCallback?.({ key: this.playerId, type: 'completed' });
    });
    this.player.addEventListener('durationchange', (event) => {
      this.duration = 0;
      this.videoHeight = 100;
      this.videoWidth = 200;
      this.buffered = 10;
    });

    this.player.addEventListener('pause', () => {
      this.eventCallback?.({ key: this.playerId, type: 'pause' });
    });

    this.player?.addEventListener('loadstart', () => {
      this.eventCallback?.({ key: this.playerId, type: 'bufferingStart' });
    });
    this.player?.addEventListener('progress', () => {
      if (this.player == null) {
        return;
      }
      const buffered = this.player.buffered;
      const duration = this.player.duration;
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
    this.player.addEventListener('loadedmetadata', (event) => {
      if (this.player == null) {
        return;
      }
      this.videoWidth = this.player.videoWidth;
      this.videoHeight = this.player.videoWidth;
      this.duration = this.player.duration;
      console.log(
        `WebOSPlayer: loadedmetadata duration: ${this.duration} width: ${this.videoWidth} height:  ${this.videoHeight}`
      );
      if (this.debug) {
        console.log(event);
      }

      this.eventCallback?.({
        key: this.playerId,
        type: 'initialized',
        duration: this.duration,
        size: {
          width: this.videoWidth,
          height: this.videoHeight,
        },
      });
    });
  }

  async destroy(): Promise<void> {
    if (this.player == null) {
      console.log('Player not initialized');
      return;
    }
    this.player?.pause();
    this.player.removeAttribute('src'); // empty source

    // are bellow lines necessary?
    this.player.load();
    webosPlayerInitialized = false;
  }

  private getSourceType(url: string): string {
    if (url.includes('.mp4')) {
      return 'video/mp4';
    }
    return 'application/x-mpegURL';
  }

  private resetMetadata(): void {
    this.duration = 0;
    this.videoHeight = 0;
    this.videoHeight = 0;
  }

  async setSrc(url: string, drm: Drm | undefined): Promise<void> {
    if (this.player == null) {
      console.log('Player not initialized');
      return;
    }

    this.resetMetadata();
    this.player.src = url;
  }

  async pause(): Promise<void> {
    if (this.player == null) {
      return;
    }
    if (!this.isPaused) {
      this.player.pause();
      this.isPaused = true;
    }
  }

  async play(): Promise<void> {
    if (this.player == null) {
      return;
    }
    this.isPaused = false;
    await this.player.play();
  }

  async position(): Promise<number> {
    if (this.player == null) {
      return 0;
    }
    return this.player.currentTime;
  }

  async seekTo(position: number): Promise<void> {
    if (this.player == null) {
      return;
    }
    this.player.currentTime = position;
  }

  async setAudioTrack(index: number, _id: string): Promise<void> {
    // FIXME - no clear audio api implementation, neither on browser or on LG
  }

  private getKeySystems(drm: Drm): Object {
    return {};
  }

  async getQualities(): Promise<Quality[]> {
    // TODO - implement
    const c: any = { id: 1, width: 100, height: 100, bitrate: 1000 };
    return Array(c);
  }

  async setQuality(
    bitrate?: number,
    width?: number,
    height?: number
  ): Promise<void> {
    // TODO - implement
  }

  async setVolume(volume: number): Promise<void> {
    if (this.player == null) {
      return;
    }
    this.player.volume = volume;
  }

  onEvent(listener: PlayerEventCallback): void {
    this.eventCallback = listener;
  }
}

export { WebOsPlayer };

// todo
// - audio tracks fetch/set
// - bitrate tracks fetch/set
// - video quality metrics logging
// - widevine support
