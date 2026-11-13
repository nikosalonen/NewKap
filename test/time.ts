import ava from 'ava';
import sinon from 'sinon';
import {formatTime} from '../main/common/time';
import {generateTimestampedName} from '../main/utils/timestamped-name';
import {extractProgressFromStderr} from '../main/converters/utils';

const test = ava.serial;

test('formats short durations as minutes and seconds', t => {
  t.is(formatTime(0, {}), '0:00');
  t.is(formatTime(5.5, {}), '0:05');
  t.is(formatTime(65, {}), '1:05');
  t.is(formatTime(599, {}), '9:59');
});

test('formats durations of an hour or more with hours', t => {
  t.is(formatTime(3725, {}), '01:02:05');
});

test('adds hundredths of a second when asked', t => {
  t.is(formatTime(65.25, {showMilliseconds: true}), '1:05.25');
  t.is(formatTime(59.999, {showMilliseconds: true}), '0:59.99');
});

test('appends the extra duration in parentheses', t => {
  t.is(formatTime(10, {extra: 20}), '0:10  (0:20)');
});

test('timestamped names use the local date and time', t => {
  const clock = sinon.useFakeTimers(new Date(2026, 10, 13, 9, 5, 7));

  try {
    t.is(generateTimestampedName(), 'Kapture 2026-11-13 at 09.05.07');
    t.is(generateTimestampedName('Screenshot', '.png'), 'Screenshot 2026-11-13 at 09.05.07.png');
  } finally {
    clock.restore();
  }
});

test('conversion progress reads the processed time from ffmpeg output', t => {
  const stderr = 'frame=  100 fps=25 q=-1.0 size=  256kB time=01:02:03.45 bitrate= 400.0kbits/s speed=2.0x';

  const result = extractProgressFromStderr(stderr, Date.now(), 2 * ((((1 * 60) + 2) * 60) + 3.45) * 1000);

  t.is(result?.progress, 0.5);
  t.is(typeof result?.estimate, 'string');
});

test('conversion progress is unknown before ffmpeg reports a speed', t => {
  t.is(extractProgressFromStderr('time=00:00:01.00 speed=N/A', Date.now(), 10_000), undefined);
});
