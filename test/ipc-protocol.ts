// The preload can't load electron-better-ipc, so main/preload.ts copies its
// message format. These checks fail when an update of the package changes it.
import fs from 'node:fs';
import path from 'node:path';
import test from 'ava';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the preload listens on the channel that main calls pages on', t => {
  const packageChannel = /export const callChannel = '([^']+)'/.exec(read('node_modules/electron-better-ipc/source/util.js'))?.[1];
  const preloadChannel = /const callFromMainChannel = '([^']+)'/.exec(read('main/preload.ts'))?.[1];

  t.truthy(packageChannel);
  t.is(preloadChannel, packageChannel);
});

test('main answers pages with {value} or {error}, as the preload expects', t => {
  const mainSource = read('node_modules/electron-better-ipc/source/main.js');

  t.regex(mainSource, /ipcMain\.handle\(channel,/);
  t.regex(mainSource, /return \{value: await callback\(/);
  t.regex(mainSource, /return \{error: serializeError\(error\)\}/);
});

test('main reads a page\'s answer as {value} or {error}, as the preload sends it', t => {
  const utilSource = read('node_modules/electron-better-ipc/source/util.js');

  t.regex(utilSource, /reply\?\.error !== undefined/);
  t.regex(utilSource, /settle\(resolve, reply\?\.value\)/);
});
