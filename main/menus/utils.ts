import {Menu} from 'electron';

export type MenuOptions = Parameters<typeof Menu.buildFromTemplate>[0];

// Leaves the accelerator out when there is no shortcut. Electron rejects an empty
// accelerator, and the option's type doesn't accept undefined.
export const acceleratorOption = (shortcut: string | undefined) => shortcut ? {accelerator: shortcut} : {};

export enum MenuItemId {
  exportHistory = 'exportHistory',
  sendFeedback = 'sendFeedback',
  openVideo = 'openVideo',
  about = 'about',
  preferences = 'preferences',
  file = 'file',
  edit = 'edit',
  window = 'window',
  help = 'help',
  app = 'app',
  saveOriginal = 'saveOriginal',
  plugins = 'plugins',
  audioDevices = 'audioDevices',
  startRecording = 'startRecording',
  stopRecording = 'stopRecording',
  captureScreenshot = 'captureScreenshot',
  pauseRecording = 'pauseRecording',
  resumeRecording = 'resumeRecording',
  duration = 'duration',
  checkForUpdates = 'checkForUpdates',
}

export const getCurrentMenuItem = (id: MenuItemId) => Menu.getApplicationMenu()?.getMenuItemById(id);

export const setExportMenuItemState = (enabled: boolean) => {
  const menuItem = Menu.getApplicationMenu()?.getMenuItemById(MenuItemId.exportHistory);

  if (menuItem) {
    menuItem.enabled = enabled;
  }
};
