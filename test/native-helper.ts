import process from 'node:process';
import test from 'ava';
import {
  getAppsForExtensionsSync,
  getAudioInputs,
  getWindows,
  pickOneWindowPerApp,
  sortAudioInputs,
} from '../main/utils/native-helper';

const window = (ownerName: string, name: string, number: number) => ({
  pid: number,
  ownerName,
  name,
  number,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
});

test('audio inputs list built-in microphones first, then by name', t => {
  const sorted = sortAudioInputs([
    {id: 'usb', name: 'USB Mic', isBuiltIn: false},
    {id: 'airpods', name: 'AirPods', isBuiltIn: false},
    {id: 'builtin', name: 'MacBook Pro Microphone', isBuiltIn: true},
  ]);

  t.deepEqual(sorted.map(device => device.id), ['builtin', 'airpods', 'usb']);
});

test('window list keeps one window per app and prefers one with a title', t => {
  const picked = pickOneWindowPerApp([
    window('Safari', '', 1),
    window('Safari', 'Apple', 2),
    window('Notes', '', 3),
    window('Notes', '', 4),
  ]);

  t.deepEqual(picked.map(win => win.number), [2, 3]);
});

// The tests below run the Swift helper, which only exists on macOS.
const macTest = process.platform === 'darwin' ? test : test.skip;

macTest('the helper lists the apps that open GIF files as file URLs', t => {
  const {gif} = getAppsForExtensionsSync(['gif']);

  t.true(Array.isArray(gif));
  for (const app of gif ?? []) {
    t.true(app.url.startsWith('file://'));
    t.is(typeof app.isDefault, 'boolean');
  }
});

macTest('the helper lists audio inputs with the default input id', async t => {
  const {defaultId, devices} = await getAudioInputs();

  t.true(Array.isArray(devices));
  if (defaultId) {
    t.true(devices.some(device => device.id === defaultId));
  }
});

macTest('the helper lists on-screen windows', async t => {
  const windows = await getWindows();

  t.true(Array.isArray(windows));
  for (const win of windows) {
    t.is(typeof win.ownerName, 'string');
    t.is(typeof win.pid, 'number');
  }
});
