import path from 'node:path';
import {app} from 'electron';

// Ture keeps its settings, plugins and recording history where Kap kept them, in
// ~/Library/Application Support/Kap. Electron names that folder after the app, so without
// this the rename to Ture would start with empty settings. main/index.ts imports this
// module first, before anything reads the folder.
app.setPath('userData', path.join(app.getPath('appData'), 'Kap'));
