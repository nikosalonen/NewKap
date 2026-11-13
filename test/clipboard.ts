import ava from 'ava';
import sinon from 'sinon';
import {copyFilesToClipboard, copyImageToClipboard} from '../main/utils/clipboard';

const test = ava.serial;

// The test mock from test/mocks/electron.ts, typed loosely so tests can swap its fakes.
const electron: any = require('electron');

const writtenItem = () => {
  const [items] = electron.clipboard.write.lastCall.args;
  return items[0].items;
};

test.beforeEach(() => {
  electron.clipboard.write = sinon.fake.resolves(undefined);
});

test('copying files puts file URLs on the clipboard', async t => {
  await copyFilesToClipboard(['/Users/me/Kap Recording.gif', '/tmp/second.mp4']);

  t.deepEqual(writtenItem(), {
    'text/uri-list': 'file:///Users/me/Kap%20Recording.gif\r\nfile:///tmp/second.mp4',
  });
});

test('copying an image puts its PNG data on the clipboard', async t => {
  const png = Buffer.from([0x89, 0x50, 0x4E, 0x47]);

  // eslint-disable-next-line @typescript-eslint/naming-convention -- the NativeImage method name
  await copyImageToClipboard({toPNG: () => png} as any);

  const blob = writtenItem()['image/png'];
  t.is(blob.type, 'image/png');
  t.deepEqual(Buffer.from(await blob.arrayBuffer()), png);
});
