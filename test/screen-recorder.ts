import fs from 'node:fs';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import ava from 'ava';
import {Encoding, type ApertureOptions} from '../main/common/types';
import type * as ScreenRecorderModule from '../main/utils/screen-recorder';
import {mockImport} from './helpers/mocks';

const test = ava.serial;

mockImport('./native-binary', 'native-binary');

// Use require so the module loads after the mock above. Import statements
// are hoisted and would load it first.
const {
  getRecorderAudioDevices,
  getRecorderOptions,
  getRecordingExtension,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ScreenRecorder,
} = require('../main/utils/screen-recorder') as typeof ScreenRecorderModule;

const options: ApertureOptions = {
  fps: 30,
  cropArea: {
    x: 100,
    y: 50,
    width: 400,
    height: 300,
  },
  showCursor: false,
  highlightClicks: false,
  screenId: 4,
  audioDeviceId: 'BuiltInMicrophoneDevice',
  videoCodec: Encoding.hevc,
};

const readOptionsTheRecorderGot = (filePath: string) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

test.afterEach(() => {
  delete process.env['FAKE_KAP_RECORDER'];
});

test('recorder options use the crop from the top-left corner and AVFoundation codec IDs', t => {
  const recorderOptions = getRecorderOptions(options, '/tmp/recording.mp4');

  t.deepEqual(recorderOptions, {
    destination: 'file:///tmp/recording.mp4',
    framesPerSecond: 30,
    cropRect: [[100, 50], [400, 300]],
    showCursor: false,
    highlightClicks: false,
    screenId: 4,
    audioDeviceId: 'BuiltInMicrophoneDevice',
    videoCodec: 'hvc1',
  });
});

test('highlighting clicks shows the cursor, since clicks are drawn around it', t => {
  t.true(getRecorderOptions({...options, highlightClicks: true}, '/tmp/recording.mp4').showCursor);
});

test('ProRes recordings go into a .mov file', t => {
  t.is(getRecordingExtension(Encoding.proRes422), 'mov');
  t.is(getRecordingExtension(Encoding.proRes4444), 'mov');
  t.is(getRecordingExtension(Encoding.hevc), 'mp4');
  t.is(getRecordingExtension(), 'mp4');
});

test('records, pauses, resumes and stops through kap-recorder', async t => {
  const recorder = new ScreenRecorder();

  const filePath = await recorder.startRecording(options);
  t.regex(filePath, /\.mp4$/);
  t.is(readOptionsTheRecorderGot(filePath).destination, `file://${filePath}`);

  t.false(await recorder.isPaused());
  await recorder.pause();
  t.true(await recorder.isPaused());
  await recorder.resume();
  t.false(await recorder.isPaused());

  t.is(await recorder.stopRecording(), filePath);
  fs.rmSync(filePath);
});

test('a failed start reports what kap-recorder said', async t => {
  process.env['FAKE_KAP_RECORDER'] = 'fail';
  const recorder = new ScreenRecorder();

  await t.throwsAsync(recorder.startRecording(options), {
    message: 'Could not start the recording: Missing screen capture permissions.',
  });
});

test('commands need a running recording', async t => {
  const recorder = new ScreenRecorder();

  await t.throwsAsync(recorder.pause(), {message: 'No recording is running'});
});

test('lists microphones', async t => {
  t.deepEqual(await getRecorderAudioDevices(), [{id: 'BuiltInMicrophoneDevice', name: 'MacBook Pro Microphone'}]);
});

test('the file URL round-trips to the file path', t => {
  const filePath = '/tmp/a folder/recording.mov';
  t.is(fileURLToPath(getRecorderOptions(options, filePath).destination), filePath);
});
