import type {Rectangle} from 'electron';

export enum Format {
  gif = 'gif',
  hevc = 'hevc',
  mp4 = 'mp4',
  webm = 'webm',
  apng = 'apng',
  av1 = 'av1',
}

export enum Encoding {
  h264 = 'h264',
  hevc = 'hevc',
  // eslint-disable-next-line unicorn/name-replacements
  proRes422 = 'proRes422',
  // eslint-disable-next-line unicorn/name-replacements
  proRes4444 = 'proRes4444',
}

export type App = {
  url: string;
  isDefault: boolean;
  icon?: string;
  name: string;
};

export type ApertureOptions = {
  fps: number;
  cropArea: Rectangle;
  showCursor: boolean;
  highlightClicks: boolean;
  screenId: number;
  audioDeviceId?: string;
  videoCodec?: Encoding;
};

export type StartRecordingOptions = {
  cropperBounds: Rectangle;
  screenBounds: Rectangle;
  displayId: number;
};
