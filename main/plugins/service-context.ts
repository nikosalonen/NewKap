import {app, clipboard} from 'electron';
import type Store from 'electron-store';
import got, {type GotFn, type GotPromise} from 'got';
import type PCancelable from 'p-cancelable';
import type {ApertureOptions, Format} from '../common/types';
import {addPluginPromise} from '../utils/deep-linking';
import {notify} from '../utils/notifications';
import {getFormatExtension} from '../common/constants';
import type {InstalledPlugin} from './plugin';

type ServiceContextOptions = {
  plugin: InstalledPlugin;
};

class ServiceContext {
  requests: Array<GotPromise<any>> = [];
  config: Store;

  private readonly plugin: InstalledPlugin;

  constructor(options: ServiceContextOptions) {
    this.plugin = options.plugin;
    this.config = this.plugin.config;
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async -- plugins get got's promise, which has cancel() and progress events
  request = (...args: Parameters<GotFn>) => {
    const request = got(...args);
    this.requests.push(request);
    return request;
  };

  copyToClipboard = (text: string) => {
    clipboard.writeText(text);
  };

  notify = async (text: string, action?: () => any) => notify({
    body: text,
    title: this.plugin.isBuiltIn ? app.name : this.plugin.prettyName,
    click: action,
  });

  // Plugins call this without waiting for it. electron-store 12 rejects when the file
  // can't be opened, so log that instead of leaving an unhandled rejection.
  openConfigFile = () => {
    this.config.openInEditor().catch((error: unknown) => {
      console.error('Could not open the plugin config file:', error);
    });
  };

  waitForDeepLink = async () => new Promise(resolve => {
    addPluginPromise(this.plugin.name, resolve);
  });
}

type ShareServiceContextOptions = {
  onProgress: (text: string, percentage: number) => void;
  filePath: (options?: {fileType?: Format}) => Promise<string>;
  format: Format;
  prettyFormat: string;
  defaultFileName: string;
  onCancel: () => void;
} & ServiceContextOptions;

export class ShareServiceContext extends ServiceContext {
  isCanceled = false;

  private readonly options: ShareServiceContextOptions;

  constructor(options: ShareServiceContextOptions) {
    super(options);
    this.options = options;
  }

  get format() {
    return this.options.format;
  }

  get prettyFormat() {
    return this.options.prettyFormat;
  }

  get defaultFileName() {
    return `${this.options.defaultFileName}.${getFormatExtension(this.options.format)}`;
  }

  filePath = async (options?: {fileType?: Format}) => this.options.filePath(options);

  setProgress = (text: string, percentage: number) => {
    this.options.onProgress(text, percentage);
  };

  cancel = () => {
    this.isCanceled = true;
    this.options.onCancel();

    for (const request of this.requests) {
      request.cancel();
    }
  };
}

type EditServiceContextOptions = {
  onProgress: (text: string, percentage: number) => void;
  inputPath: string;
  outputPath: string;
  exportOptions: {
    width: number;
    height: number;
    format: Format;
    fps: number;
    duration: number;
    isMuted: boolean;
    loop: boolean;
  };
  convert: (args: string[], text?: string) => PCancelable<void>;
  onCancel: () => void;
} & ServiceContextOptions;

export class EditServiceContext extends ServiceContext {
  isCanceled = false;

  private readonly options: EditServiceContextOptions;

  constructor(options: EditServiceContextOptions) {
    super(options);
    this.options = options;
  }

  get inputPath() {
    return this.options.inputPath;
  }

  get outputPath() {
    return this.options.outputPath;
  }

  get exportOptions() {
    return this.options.exportOptions;
  }

  get convert() {
    return this.options.convert;
  }

  setProgress = (text: string, percentage: number) => {
    this.options.onProgress(text, percentage);
  };

  cancel = () => {
    this.isCanceled = true;
    this.options.onCancel();

    for (const request of this.requests) {
      request.cancel();
    }
  };
}

export type RecordServiceState<PersistedState extends Record<string, unknown> = Record<string, unknown>> = {
  persistedState?: PersistedState;
};

export type RecordServiceContextOptions<State extends RecordServiceState> = {
  apertureOptions: ApertureOptions;
  state: State;
  setRecordingName: (name: string) => void;
} & ServiceContextOptions;

export class RecordServiceContext<State extends RecordServiceState> extends ServiceContext {
  private readonly options: RecordServiceContextOptions<State>;

  constructor(options: RecordServiceContextOptions<State>) {
    super(options);
    this.options = options;
  }

  get state() {
    return this.options.state;
  }

  get apertureOptions() {
    return this.options.apertureOptions;
  }

  get setRecordingName() {
    return this.options.setRecordingName;
  }
}
