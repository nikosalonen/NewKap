import fs from 'node:fs';
import path from 'node:path';
import test from 'ava';
import {renderTimeline} from '../main/converters/timeline';
import {getVideoMetadata} from './helpers/video-utils';
import {almostEquals} from './helpers/assertions';

test('timeline composes split clips at different speeds with audio', async t => {
  const outputPath = await renderTimeline({
    inputPath: path.resolve(__dirname, 'fixtures', 'input@2x.mp4'),
    hasAudio: true,
    onProgress() {},
    clips: [
      {
        id: 'first', startTime: 0, endTime: 1, speed: 2,
      },
      {
        id: 'last', startTime: 2, endTime: 3, speed: 1,
      },
    ],
  });

  try {
    const metadata = await getVideoMetadata(outputPath);
    t.true(metadata.hasAudio);
    // 1 s at double speed plus 1 s at normal speed.
    t.true(almostEquals(metadata.duration, 1.5, 0.15));
  } finally {
    await fs.promises.unlink(outputPath);
  }
});
