import {ipcMain} from 'electron';
import {setTimeout as delay} from 'node:timers/promises';
import * as ipc from '../utils/ipc';
import KapWindow from './kap-window';
import {windowManager} from './manager';

let prefsKapWindow: KapWindow | undefined;

export type PreferencesWindowOptions = any;

const openPrefsWindow = async (options?: PreferencesWindowOptions) => {
  windowManager.cropper?.close();

  const prefsWindow = prefsKapWindow?.browserWindow;
  if (prefsWindow) {
    if (options) {
      ipc.notifyRenderer(prefsWindow, 'options', options);
    }

    prefsWindow.show();
    prefsWindow.focus();
    return prefsWindow;
  }

  const newPrefsKapWindow = new KapWindow({
    title: 'Preferences',
    width: 620,
    height: 620,
    minWidth: 560,
    minHeight: 520,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    show: false,
    frame: false,
    transparent: true,
    vibrancy: 'window',
    dock: true,
    route: 'preferences',
  });
  prefsKapWindow = newPrefsKapWindow;

  const newPrefsWindow = newPrefsKapWindow.browserWindow;

  const titlebarHeight = 85;
  newPrefsWindow.setSheetOffset(titlebarHeight);

  newPrefsWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[preferences] render process gone', details);
  });

  const rendererReadyPromise = new Promise<void>(resolve => {
    const handleReady = (event: Electron.IpcMainEvent) => {
      if (event.sender !== newPrefsWindow.webContents) {
        return;
      }

      ipcMain.removeListener('preferences-renderer-ready', handleReady);
      resolve();
    };

    ipcMain.on('preferences-renderer-ready', handleReady);
    newPrefsWindow.once('closed', () => ipcMain.removeListener('preferences-renderer-ready', handleReady));
  });

  newPrefsWindow.on('close', () => {
    prefsKapWindow = undefined;
  });

  await Promise.race([
    rendererReadyPromise,
    delay(500),
  ]);

  if (options) {
    ipc.notifyRenderer(newPrefsWindow, 'options', options);
  }

  await newPrefsKapWindow.whenReady();
  return newPrefsWindow;
};

const closePrefsWindow = () => {
  prefsKapWindow?.browserWindow.close();
};

// Answer with nothing: a BrowserWindow can't be sent to the renderer.
ipc.answerRenderer('open-preferences', async (options?: PreferencesWindowOptions) => {
  await openPrefsWindow(options);
});

windowManager.setPreferences({
  open: openPrefsWindow,
  close: closePrefsWindow,
});
