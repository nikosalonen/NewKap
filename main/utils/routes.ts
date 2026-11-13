import {app, type BrowserWindow} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {is} from 'electron-util';

export const loadRoute = async (window: BrowserWindow, routeName: string, {openDevTools = false}: {openDevTools?: boolean} = {}) => {
  const staticRoute = path.join(app.getAppPath(), 'renderer', 'out', `${routeName}.html`);
  const loadPromise = (!is.development || fs.existsSync(staticRoute))
    ? window.loadFile(staticRoute)
    : window.loadURL(`http://localhost:8000/${routeName}`);

  if (openDevTools) {
    window.webContents.openDevTools({mode: 'detach'});
  }

  return loadPromise;
};
