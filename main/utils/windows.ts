import {app} from 'electron';
import execa from 'execa';
import Store from 'electron-store';
import {windowManager} from '../windows/manager';
import {getWindows, HelperWindow} from './native-helper';

export type MacWindow = HelperWindow;

const APP_BLACKLIST = [
  'Kap',
  'Kap Beta'
];

const store = new Store<{
  appUsageHistory: Record<number, {
    count: number;
    lastUsed: number;
  } | undefined>;
}>({
  name: 'usage-history'
});

const usageHistory = store.get('appUsageHistory', {});

const getAppIconDataUrl = async (appPath?: string) => {
  if (!appPath) {
    return undefined;
  }

  try {
    return (await app.getFileIcon(appPath, {size: 'small'})).toDataURL();
  } catch {
    return undefined;
  }
};

const getAppWindows = async () => {
  try {
    return await getWindows();
  } catch (error) {
    console.error('Could not list windows:', error);
    return [];
  }
};

export const getWindowList = async () => {
  const windows = (await getAppWindows()).filter(window => !APP_BLACKLIST.includes(window.ownerName));
  const windowsWithIcons = await Promise.all(windows.map(async window => ({
    ...window,
    icon: await getAppIconDataUrl(window.appPath)
  })));

  return windowsWithIcons.sort((a, b) => a.ownerName.localeCompare(b.ownerName));
};

// Launch Services brings a running app to the front without asking for Automation access.
const bringAppToFront = async (window: MacWindow) => {
  await execa('/usr/bin/open', ['-a', window.appPath ?? window.ownerName]);
};

const updateAppUsageHistory = (app: MacWindow) => {
  const {count = 0} = usageHistory[app.pid] ?? {};

  usageHistory[app.pid] = {
    count: count + 1,
    lastUsed: Date.now()
  };

  store.set('appUsageHistory', usageHistory);
};

export const activateApp = (window: MacWindow) => {
  updateAppUsageHistory(window);
  windowManager.cropper?.selectApp(window, bringAppToFront);
};
