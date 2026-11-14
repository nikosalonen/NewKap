'use strict';

import {BrowserWindow} from 'electron';
import {once} from 'node:events';
import path from 'node:path';
import * as ipc from '../utils/ipc';
import {loadRoute} from '../utils/routes';
import {windowManager} from './manager';

// The page asks for its plugin once it listens for it. Sending the plugin on
// did-finish-load is too early: React mounts the page after the load event,
// the message gets lost, and the window never shows.
const showWhenReady = async (configWindow: BrowserWindow, sendPlugin: () => Promise<unknown>) => {
  const stopAnswering = ipc.answerRenderer(configWindow, 'config-ready', async () => {
    await sendPlugin();
    configWindow.show();
  });

  loadRoute(configWindow, 'config');
  await once(configWindow, 'closed');
  stopAnswering();
};

const openConfigWindow = async (pluginName: string) => {
  const prefsWindow = await windowManager.preferences?.open();
  const configWindow = new BrowserWindow({
    width: 320,
    height: 436,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    show: false,
    ...(prefsWindow && {parent: prefsWindow}),
    modal: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  await showWhenReady(configWindow, async () => ipc.callRenderer(configWindow, 'plugin', pluginName));
};

const openEditorConfigWindow = async (pluginName: string, serviceTitle: string, editorWindow: BrowserWindow) => {
  const configWindow = new BrowserWindow({
    width: 480,
    height: 420,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    show: false,
    parent: editorWindow,
    modal: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  await showWhenReady(configWindow, async () => ipc.callRenderer(configWindow, 'edit-service', {pluginName, serviceTitle}));
};

ipc.answerRenderer('open-edit-config', async ({pluginName, serviceTitle}, window) => openEditorConfigWindow(pluginName, serviceTitle, window));

windowManager.setConfig({
  open: openConfigWindow,
});
