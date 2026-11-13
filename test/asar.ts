import test from 'ava';
import {fixPathForAsarUnpack} from '../main/utils/asar';

const resources = '/Applications/Kap.app/Contents/Resources';

test('binaries inside app.asar point to app.asar.unpacked', t => {
  t.is(
    fixPathForAsarUnpack(`${resources}/app.asar/node_modules/ffmpeg-static/ffmpeg`),
    `${resources}/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg`,
  );
});

test('paths outside app.asar are unchanged', t => {
  const devPath = '/Users/someone/NewKap/node_modules/ffmpeg-static/ffmpeg';
  const unpackedPath = `${resources}/app.asar.unpacked/node_modules/gifsicle/vendor/gifsicle`;

  t.is(fixPathForAsarUnpack(devPath), devPath);
  t.is(fixPathForAsarUnpack(unpackedPath), unpackedPath);
});
