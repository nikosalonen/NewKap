'use strict';

import {BrowserWindow} from 'electron';
import type {Rectangle} from 'electron';
import path from 'node:path';
import {ipcMain as ipc} from 'electron-better-ipc';
import {loadRoute} from '../utils/routes';
import {windowManager} from './manager';

const DIALOG_MIN_WIDTH = 420;
const DIALOG_MIN_HEIGHT = 150;

export type DialogOptions = any;

const showDialog = async (options: DialogOptions) => new Promise<number | void>(resolve => {
  const dialogWindow = new BrowserWindow({
    width: 1,
    height: 1,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    vibrancy: 'window',
    show: false,
    alwaysOnTop: true,
    center: true,
    title: '',
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  loadRoute(dialogWindow, 'dialog');

  let buttons: any[];
  let wasActionTaken;

  const updateUi = async (newOptions: DialogOptions) => {
    wasActionTaken = true;
    buttons = newOptions.buttons.map((button: any) => typeof button === 'string' ? {label: button} : button);

    const cancelButton = buttons.findIndex(({label}) => label === 'Cancel');

    const {width, height} = await ipc.callRenderer<any, Rectangle>(dialogWindow, 'data', {
      cancelId: cancelButton > 0 ? cancelButton : undefined,
      ...options,
      ...newOptions,
      buttons: buttons.map(({label, activeLabel}) => ({label, activeLabel})),
      id: dialogWindow.id,
    });

    const bounds = dialogWindow.getBounds();
    const titleBarHeight = dialogWindow.getSize()[1] - dialogWindow.getContentSize()[1];

    dialogWindow.setBounds({
      width: Math.max(width, bounds.width, DIALOG_MIN_WIDTH),
      height: Math.max(height + titleBarHeight, bounds.height, DIALOG_MIN_HEIGHT),
    });
  };

  const unsubscribe = ipc.answerRenderer(`dialog-action-${dialogWindow.id}`, async (index: number) => {
    const button = buttons[index];

    if (!button?.action) {
      cleanup(button ? index : undefined);
      return;
    }

    wasActionTaken = false;
    await button.action(cleanup, updateUi);

    if (!wasActionTaken) {
      cleanup(index);
    }
  });

  const cleanup = (value?: number) => {
    wasActionTaken = true;
    unsubscribe();
    dialogWindow.close();
    resolve(value);
  };

  dialogWindow.webContents.on('did-finish-load', async () => {
    await updateUi(options);
    dialogWindow.show();
  });
});

windowManager.setDialog({
  open: showDialog,
});
