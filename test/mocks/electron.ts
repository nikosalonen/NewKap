import {EventEmitter} from 'node:events';
import process from 'node:process';
import path from 'node:path';
import sinon from 'sinon';
import tempy from 'tempy';

const temporaryDir = tempy.directory();

process.env['TZ'] = 'America/New_York';
(process.versions as any).chrome = '';

export const app = {
  getPath: (name: string) => path.resolve(temporaryDir, name),
  setPath: sinon.fake(),
  isPackaged: false,
  getVersion: () => '0.0.0',
  focus: sinon.fake(),
  quit: sinon.fake(),
  on: sinon.fake(),
};

let nextWindowId = 1;

// Like Electron, emits 'show' and 'hide' with the window as `this` for listeners.
export class BrowserWindow extends EventEmitter {
  readonly id = nextWindowId++;
  readonly webContents = new EventEmitter();
  loadFile = sinon.fake.resolves(undefined);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  loadURL = sinon.fake.resolves(undefined);
  focus = sinon.fake();
  private visible = false;

  constructor(readonly options: Record<string, unknown> = {}) {
    super();
  }

  isDestroyed() {
    return false;
  }

  isVisible() {
    return this.visible;
  }

  show() {
    this.visible = true;
    this.emit('show');
  }

  hide() {
    this.visible = false;
    this.emit('hide');
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Menu = {
  buildFromTemplate: sinon.fake((template: unknown[]) => ({template})),
  setApplicationMenu: sinon.fake(),
};

// The electron-store package registers an IPC handler for renderer stores.
export const ipcMain = {
  on: sinon.fake(),
};

export const shell = {
  showItemInFolder: sinon.fake(),
  openExternal: sinon.fake.resolves(undefined),
};

export const clipboard = {
  writeText: sinon.fake.resolves(undefined),
  write: sinon.fake.resolves(undefined),
};

export class ClipboardItem {
  constructor(readonly items: Record<string, unknown>) {}
}

export const systemPreferences = {
  getMediaAccessStatus: sinon.fake.returns('granted'),
  askForMediaAccess: sinon.fake.resolves(true),
};

export const dialog = {
  showMessageBox: sinon.fake.resolves({response: 1}),
};

export const desktopCapturer = {
  getSources: sinon.fake.resolves([]),
};

export const remote = {};
