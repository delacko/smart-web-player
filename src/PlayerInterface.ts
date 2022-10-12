export type DrmType = 'widevine' | 'fairplay' | 'clearkey';

export interface Drm {
  type: DrmType;
  data: {
    certificateUrl?: string;
    licenseUrl: string;
  };
  headers?: Map<string, string>;
}

export interface Quality {
  id: string;
  width?: number;
  height?: number;
  bitrate?: number;
}

export interface BufferedRange {
  start: number;
  end: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PlayerEvent {
  key: string;
  type:
    | 'completed'
    | 'play'
    | 'pause'
    | 'bufferingStart'
    | 'bufferingEnd'
    | 'bufferingUpdate'
    | 'initialized';
  buffered?: BufferedRange[];
  duration?: number;
  size?: Size;
}

export type PlayerEventCallback = (event: PlayerEvent) => void;

export interface PlayerInterface {
  viewElement: () => HTMLElement;

  init: () => Promise<void>;

  destroy: () => Promise<void>;

  setSrc: (url: string, drm?: Drm) => Promise<void>;

  play: () => Promise<void>;

  pause: () => Promise<void>;

  seekTo: (position: number) => Promise<void>;

  position: () => Promise<number>;

  setVolume: (volume: number) => Promise<void>;
  setAudioTrack: (index: number, id: string) => Promise<void>;

  getQualities: () => Promise<Quality[]>;
  setQuality: (bitrate?: number, width?: number, height?: number) => any;

  onEvent: (listener: PlayerEventCallback) => void;
}
