import {
  Drm,
  PlayerEventCallback,
  PlayerInterface,
  Quality,
} from './PlayerInterface';

import { avplay } from 'tizen-tv-webapis';

let tizenPlayerInitialized = false;

class TizenPlayer implements PlayerInterface {
  private player: HTMLElement | null = null;
  private isPaused: boolean = false;
  private readonly buffered: number = 0;
  private duration: number = 0;
  private readonly videoWidth: number = 0;
  private videoHeight: number = 0;
  private readonly playerId: string = 'video_js_player';
  private eventCallback?: PlayerEventCallback;

  isInitialized(): boolean {
    console.log('');
    return tizenPlayerInitialized;
  }

  viewElement(): HTMLElement {
    const playerWrapper = document.getElementById(
      'videoPlaceholder'
    ) as HTMLElement;

    if (tizenPlayerInitialized) {
      return playerWrapper;
    }

    playerWrapper.style.width = '100%';
    playerWrapper.style.height = '100%';

    const videoElement = document.createElement('object');
    videoElement.type = 'application/avplayer';
    videoElement.style.setProperty('position', 'absolute');
    videoElement.style.setProperty('left', '0px');
    videoElement.style.setProperty('top', '0px');
    videoElement.style.setProperty('width', '1920px');
    videoElement.style.setProperty('height', '1080px');
    videoElement.style.setProperty('zindex', '999');
    videoElement.id = this.playerId;

    playerWrapper.appendChild(videoElement);
    this.player = document.getElementById(this.playerId);

    playerWrapper.addEventListener('contextmenu', (event) =>
      event.preventDefault()
    );

    return playerWrapper;
  }

  async init(): Promise<void> {
    if (tizenPlayerInitialized) {
      return;
    }

    if (typeof document.getElementById(this.playerId) !== 'undefined') {
      // this.player = document.getElementById(this.playerId) as unknown as AVPlayManager
    }

    // Add a new source element
    tizenPlayerInitialized = true;
    this.addPlayerListeners();
  }

  addPlayerListeners(): void {
    // TODO implement listeners
  }

  async destroy(): Promise<void> {
    // TODO - implement destroy
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
    console.log('SetSrc ' + url);
    if (this.player == null) {
      console.log('Player not initialized');
      return;
    }
    // FIXME - should we use async set?
    this.resetMetadata();
    console.log(this.player);
    avplay.open(url);
  }

  async pause(): Promise<void> {
    if (this.player == null) {
      return;
    }
    if (!this.isPaused) {
      avplay.pause();
      this.isPaused = true;
    }
  }

  async play(): Promise<void> {
    if (this.player == null) {
      return;
    }
    this.isPaused = false;
    await avplay.play();
  }

  async position(): Promise<number> {
    if (this.player == null) {
      return 0;
    }
    return avplay.getCurrentTime();
  }

  async seekTo(position: number): Promise<void> {
    if (this.player == null) {
      return;
    }
    avplay.seekTo(position);
  }

  async setAudioTrack(index: number, _id: string): Promise<void> {
    // TODO - implement set audio track api
  }

  private getKeySystems(drm: Drm): Object {
    // implement drm
    console.error('not supported drm type');
    return {};
  }

  async getQualities(): Promise<Quality[]> {
    // FIXME
    const c: any = { id: 1, width: 100, height: 100, bitrate: 1000 };
    return Array(c);
  }

  async setQuality(
    bitrate?: number,
    width?: number,
    height?: number
  ): Promise<void> {
    // FIXME - have to find way to set video bitrate
  }

  async setVolume(volume: number): Promise<void> {
    // FIXME  - not available at all on tizen - expected to use RCU
  }

  onEvent(listener: PlayerEventCallback): void {
    this.eventCallback = listener;
  }
}

export { TizenPlayer };

// todo
// - audio tracks fetch/set
// - bitrate tracks fetch/set
// - video quality metrics logging
// - widevine support
