import fs from 'node:fs';
import path from 'node:path';
import ava from 'ava';
import sinon from 'sinon';
import {ensureMicrophonePermissions, ensureScreenCapturePermissions} from '../main/common/system-permissions';

const test = ava.serial;

// The test mock from test/mocks/electron.ts, typed loosely so tests can swap its fakes.
const electron: any = require('electron');

const screenCaptureRequestedMarker = path.join(electron.app.getPath('userData'), '.has-app-requested-screen-capture-permissions');

const givenAccess = (statuses: {screen?: string; microphone?: string}) => {
  electron.systemPreferences.getMediaAccessStatus = sinon.fake((mediaType: 'screen' | 'microphone') => statuses[mediaType]);
};

// Each build of the app has a different executable, because the executable
// holds the code signature.
const givenBuild = (executableContent: string) => {
  const executable = electron.app.getPath('exe');
  fs.mkdirSync(path.dirname(executable), {recursive: true});
  fs.writeFileSync(executable, executableContent);
};

const givenScreenCaptureWasRequestedBefore = async () => {
  await ensureScreenCapturePermissions();
  electron.desktopCapturer.getSources = sinon.fake.resolves([]);
  electron.dialog.showMessageBox.resetHistory();
};

const givenDialogAnswer = (response: number) => {
  electron.dialog.showMessageBox = sinon.fake.resolves({response});
};

test.beforeEach(() => {
  givenAccess({});
  givenDialogAnswer(1);
  electron.systemPreferences.askForMediaAccess = sinon.fake.resolves(false);
  electron.desktopCapturer.getSources = sinon.fake.resolves([]);
  electron.shell.openExternal = sinon.fake.resolves(undefined);
  electron.app.focus = sinon.fake();
  electron.app.quit = sinon.fake();
  fs.rmSync(screenCaptureRequestedMarker, {force: true});
  givenBuild('build 1');
});

test('screen capture is allowed when macOS reports access as granted', async t => {
  givenAccess({screen: 'granted'});

  t.true(await ensureScreenCapturePermissions());
  t.is(electron.dialog.showMessageBox.callCount, 0);
  t.is(electron.desktopCapturer.getSources.callCount, 0);
});

test('first screen capture check asks macOS and does not show the Kap dialog', async t => {
  givenAccess({screen: 'denied'});

  t.false(await ensureScreenCapturePermissions());
  t.is(electron.desktopCapturer.getSources.callCount, 1);
  t.is(electron.dialog.showMessageBox.callCount, 0);
});

test('later screen capture checks show the Kap dialog instead of asking macOS again', async t => {
  givenAccess({screen: 'denied'});
  await givenScreenCaptureWasRequestedBefore();

  t.false(await ensureScreenCapturePermissions());
  t.is(electron.dialog.showMessageBox.callCount, 1);
  t.is(electron.desktopCapturer.getSources.callCount, 0);
});

test('a new build asks macOS again, even if an earlier build already asked', async t => {
  givenAccess({screen: 'denied'});
  await givenScreenCaptureWasRequestedBefore();
  givenBuild('build 2');

  t.false(await ensureScreenCapturePermissions());
  t.is(electron.desktopCapturer.getSources.callCount, 1);
  t.is(electron.dialog.showMessageBox.callCount, 0);
});

test('opening System Settings for screen capture quits Kap so the grant can apply', async t => {
  givenAccess({screen: 'denied'});
  await givenScreenCaptureWasRequestedBefore();
  givenDialogAnswer(0);

  await ensureScreenCapturePermissions();

  t.regex(electron.shell.openExternal.lastArg, /Privacy_ScreenCapture/);
  t.is(electron.app.quit.callCount, 1);
});

test('microphone access is requested from macOS when it was never asked', async t => {
  givenAccess({microphone: 'not-determined'});
  electron.systemPreferences.askForMediaAccess = sinon.fake.resolves(true);

  t.true(await ensureMicrophonePermissions());
  t.is(electron.systemPreferences.askForMediaAccess.lastArg, 'microphone');
});

test('declining the macOS microphone prompt does not show a second dialog', async t => {
  givenAccess({microphone: 'not-determined'});

  t.false(await ensureMicrophonePermissions());
  t.is(electron.dialog.showMessageBox.callCount, 0);
});

test('denied microphone access shows the Kap dialog', async t => {
  givenAccess({microphone: 'denied'});

  t.false(await ensureMicrophonePermissions());
  t.is(electron.dialog.showMessageBox.callCount, 1);
});

test('restricted microphone access shows the Kap dialog', async t => {
  givenAccess({microphone: 'restricted'});

  t.false(await ensureMicrophonePermissions());
  t.is(electron.dialog.showMessageBox.callCount, 1);
});

test('opening System Settings for the microphone does not quit Kap', async t => {
  givenAccess({microphone: 'denied'});
  givenDialogAnswer(0);

  await ensureMicrophonePermissions();

  t.regex(electron.shell.openExternal.lastArg, /Privacy_Microphone/);
  t.is(electron.app.quit.callCount, 0);
});
