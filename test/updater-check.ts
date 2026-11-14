import ava from 'ava';
import sinon from 'sinon';
import type * as Updater from '../main/updater';

const test = ava.serial;

// Replace got before the updater loads it.
const fakeGot = sinon.stub();
require.cache[require.resolve('got')] = {exports: fakeGot} as unknown as NodeJS.Module;
const {checkForUpdates} = require('../main/updater') as typeof Updater;

// The test mock from test/mocks/electron.ts, typed loosely so tests can swap its fakes.
const electron: any = require('electron');

// Got 11 keeps the status code on error.response.
const httpError = (statusCode: number) => Object.assign(new Error(`Response code ${statusCode}`), {response: {statusCode}});

test.beforeEach(() => {
  fakeGot.reset();
  electron.dialog.showMessageBox = sinon.fake.resolves({response: 0});
});

// GitHub answers 404 for releases/latest until a repository has a release.
test('a repository without releases counts as up to date', async t => {
  fakeGot.rejects(httpError(404));

  await checkForUpdates({silent: false});

  t.is(electron.dialog.showMessageBox.lastArg.message, 'You’re up to date');
});

test('other errors still report a failed check', async t => {
  fakeGot.rejects(httpError(500));

  await checkForUpdates({silent: false});

  t.is(electron.dialog.showMessageBox.lastArg.message, 'Update Check Failed');
});

// Given got 9's `json: true`, got 11 sends `true` as a JSON body and throws,
// so every update check would fail.
test('asks got to parse the reply as JSON', async t => {
  fakeGot.rejects(httpError(404));

  await checkForUpdates();

  t.is(fakeGot.firstCall.args[1].responseType, 'json');
});

test('a newer release offers the update', async t => {
  /* eslint-disable @typescript-eslint/naming-convention -- GitHub API field names */
  fakeGot.resolves({body: {tag_name: 'v99.0.0', assets: []}});
  /* eslint-enable @typescript-eslint/naming-convention */

  await checkForUpdates({silent: false});

  t.is(electron.dialog.showMessageBox.lastArg.message, 'Update Available');
});
