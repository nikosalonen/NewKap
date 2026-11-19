import ava from 'ava';
import type * as KapWindowModule from '../main/windows/kap-window';
import type * as DockMock from './mocks/dock';
import {mockImport} from './helpers/mocks';

// Every test shares the static window list in KapWindow, so run them one at a time.
const test = ava.serial;

mockImport('electron-better-ipc', 'electron-better-ipc');
mockImport('../menus/application', 'application-menu');
mockImport('../utils/routes', 'routes');
const {setDockVisible} = mockImport('../utils/dock', 'dock') as typeof DockMock;

// Use require so the module loads after the mocks above. Import statements
// are hoisted and would load it first.
// eslint-disable-next-line @typescript-eslint/naming-convention
const {default: KapWindow} = require('../main/windows/kap-window') as typeof KapWindowModule;

const openDockWindow = () => {
  const window = new KapWindow({route: 'editor', dock: true});
  window.browserWindow.show();
  return window;
};

const close = (window: InstanceType<typeof KapWindow>) => {
  window.browserWindow.emit('closed');
};

test('hiding the last visible dock window hides the dock', t => {
  const window = openDockWindow();
  setDockVisible.resetHistory();

  t.notThrows(() => {
    window.browserWindow.hide();
  });
  t.true(setDockVisible.calledOnceWithExactly(false));

  close(window);
});

test('hiding a dock window keeps the dock while another one is visible', t => {
  const first = openDockWindow();
  const second = openDockWindow();
  setDockVisible.resetHistory();

  first.browserWindow.hide();
  t.true(setDockVisible.notCalled);

  close(first);
  close(second);
});
