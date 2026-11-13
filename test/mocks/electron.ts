import sinon from 'sinon';
import tempy from 'tempy';
import path from 'path';

const temporaryDir = tempy.directory();

process.env.TZ = 'America/New_York';
(process.versions as any).chrome = '';

export const app = {
  getPath: (name: string) => path.resolve(temporaryDir, name),
  isPackaged: false,
  getVersion: '',
  focus: sinon.fake(),
  quit: sinon.fake()
};

export const shell = {
  showItemInFolder: sinon.fake(),
  openExternal: sinon.fake.resolves(undefined)
};

export const clipboard = {
  writeText: sinon.fake.resolves(undefined),
  write: sinon.fake.resolves(undefined)
};

export class ClipboardItem {
  constructor(readonly items: Record<string, unknown>) {}
}

export const systemPreferences = {
  getMediaAccessStatus: sinon.fake.returns('granted'),
  askForMediaAccess: sinon.fake.resolves(true)
};

export const dialog = {
  showMessageBox: sinon.fake.resolves({response: 1})
};

export const desktopCapturer = {
  getSources: sinon.fake.resolves([])
};

export const remote = {};
