import type {BrowserWindow} from 'electron';
import type {MacWindow} from '../utils/windows';
import type {Video} from '../video';
import type {DialogOptions} from './dialog';
import type {PreferencesWindowOptions} from './preferences';

export type EditorManager = {
  open: (video: Video) => Promise<void>;
  areAnyBlocking: () => boolean;
};

export type CropperManager = {
  open: () => Promise<void>;
  close: () => void;
  disable: () => void;
  setRecording: () => void;
  startRecording: () => void;
  isOpen: () => boolean;
  selectApp: (window: MacWindow, activateWindow: (window: MacWindow) => Promise<void>) => void;
  sendCountdown?: (value: number) => void;
};

export type ConfigManager = {
  open: (pluginName: string) => Promise<void>;
};

export type DialogManager = {
  open: (options: DialogOptions) => Promise<number | void>;
};

export type ExportsManager = {
  open: () => Promise<BrowserWindow>;
  get: () => BrowserWindow | undefined;
};

export type PreferencesManager = {
  open: (options?: PreferencesWindowOptions) => Promise<BrowserWindow>;
  close: () => void;
};

export class WindowManager {
  editor?: EditorManager;
  cropper?: CropperManager;
  config?: ConfigManager;
  dialog?: DialogManager;
  exports?: ExportsManager;
  preferences?: PreferencesManager;
  screenshot?: ScreenshotManager;

  setEditor = (editorManager: EditorManager) => {
    this.editor = editorManager;
  };

  setCropper = (cropperManager: CropperManager) => {
    this.cropper = cropperManager;
  };

  setConfig = (configManager: ConfigManager) => {
    this.config = configManager;
  };

  setDialog = (dialogManager: DialogManager) => {
    this.dialog = dialogManager;
  };

  setExports = (exportsManager: ExportsManager) => {
    this.exports = exportsManager;
  };

  setPreferences = (preferencesManager: PreferencesManager) => {
    this.preferences = preferencesManager;
  };
}

export type ScreenshotManager = {
  open: (filePath: string) => Promise<void>;
};

export const windowManager = new WindowManager();
