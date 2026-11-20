import path from 'node:path';
import test from 'ava';

// The test mock from test/mocks/electron.ts, typed loosely to read its fakes.
const electron: any = require('electron');

test('the data folder stays Kap after the rename to Ture', t => {
  require('../main/utils/user-data-path');

  const kapFolder = path.join(electron.app.getPath('appData'), 'Kap');
  t.true(electron.app.setPath.calledOnceWithExactly('userData', kapFolder));
});
