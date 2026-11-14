import test from 'ava';
import sinon from 'sinon';
import type * as IpcModule from '../main/utils/ipc';
import type * as BetterIpcMock from './mocks/electron-better-ipc';
import {mockImport} from './helpers/mocks';

const {handlers, ipcMain: betterIpc} = mockImport('electron-better-ipc', 'electron-better-ipc') as typeof BetterIpcMock;

// Use require so the module loads after the mock above. Import statements
// are hoisted and would load it first.
const {answerRenderer, notifyRenderer} = require('../main/utils/ipc') as typeof IpcModule;

const firstWindow = {id: 1} as any;
const secondWindow = {id: 2} as any;
const thirdWindow = {id: 3} as any;

const call = async (channel: string, data: unknown, window: unknown) => {
  const handler = handlers.get(channel);
  if (!handler) {
    throw new Error(`Nothing answers '${channel}'`);
  }

  return handler(data, window);
};

test('a call goes to the handler of the window that made it', async t => {
  answerRenderer(firstWindow, 'per-window', () => 'first');
  answerRenderer(secondWindow, 'per-window', (data: string, window) => `second got ${data} from ${window.id}`);

  t.is(await call('per-window', undefined, firstWindow), 'first');
  t.is(await call('per-window', 'hi', secondWindow), 'second got hi from 2');
});

test('without its own handler, a window gets the handler for all windows', async t => {
  answerRenderer('fallback', () => 'everyone');
  answerRenderer(firstWindow, 'fallback', () => 'first');

  t.is(await call('fallback', undefined, firstWindow), 'first');
  t.is(await call('fallback', undefined, secondWindow), 'everyone');
});

test('a window with no handler gets an error', async t => {
  answerRenderer(firstWindow, 'only-first', () => 'first');

  await t.throwsAsync(call('only-first', undefined, thirdWindow), {message: 'No handler for \'only-first\' in window 3'});
  await t.throwsAsync(call('only-first', undefined, undefined), {message: '\'only-first\' was called from outside a window'});
});

test('the channel stops when its last handler stops', t => {
  const stopFirst = answerRenderer(firstWindow, 'stopping', () => 'first');
  const stopAll = answerRenderer('stopping', () => 'everyone');

  stopFirst();
  t.true(handlers.has('stopping'));

  stopAll();
  t.false(handlers.has('stopping'));
});

test('registering a channel twice for the same window or for all windows throws', t => {
  answerRenderer(firstWindow, 'twice', () => 'first');
  answerRenderer('twice', () => 'everyone');

  t.throws(() => answerRenderer(firstWindow, 'twice', () => 'again'), {message: 'Window 1 already answers \'twice\''});
  t.throws(() => answerRenderer('twice', () => 'again'), {message: '\'twice\' already has a handler'});
});

test('an old stop function does not remove a newer handler', async t => {
  const stopOld = answerRenderer(firstWindow, 'replaced', () => 'old');
  stopOld();
  answerRenderer(firstWindow, 'replaced', () => 'new');

  stopOld();
  t.is(await call('replaced', undefined, firstWindow), 'new');
});

test.serial('notifyRenderer only logs a call that fails', async t => {
  const warn = sinon.stub(console, 'warn');
  t.teardown(() => {
    warn.restore();
  });
  betterIpc.callRenderer.rejects(new Error('Browser window is destroyed'));

  notifyRenderer(firstWindow, 'gone', {some: 'data'});
  await new Promise(resolve => {
    setImmediate(resolve);
  });

  t.true(betterIpc.callRenderer.calledWith(firstWindow, 'gone', {some: 'data'}));
  t.true(warn.calledWith('[ipc] \'gone\' not delivered:', 'Browser window is destroyed'));
});
