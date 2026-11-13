import ava from 'ava';
import sinon from 'sinon';

const test = ava.serial;

const {startAudioLevelMeter} = require('../renderer/utils/audio-level-meter');

const flushPromises = async () => new Promise(resolve => {
  setImmediate(resolve);
});

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state = 'running';
  destination = {};
  processor: any;
  close = sinon.fake(async () => {
    this.state = 'closed';
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createAnalyser() {
    return {
      connect: sinon.fake(),
      frequencyBinCount: 4,
      getByteFrequencyData: (levels: Uint8Array) => levels.fill(40)
    };
  }

  createMediaStreamSource() {
    return {connect: sinon.fake()};
  }

  createScriptProcessor() {
    this.processor = {connect: sinon.fake(), disconnect: sinon.fake(), onaudioprocess: null};
    return this.processor;
  }
}

const givenMicrophone = () => {
  const track = {stop: sinon.fake()};
  const stream = {getTracks: () => [track]};
  let openMicrophone: (stream: unknown) => void = () => undefined;
  const getUserMedia = sinon.fake(async () => new Promise(resolve => {
    openMicrophone = resolve;
  }));

  Object.defineProperty(globalThis, 'navigator', {value: {mediaDevices: {getUserMedia}}, configurable: true, writable: true});
  (globalThis as any).AudioContext = FakeAudioContext;

  return {
    track,
    getUserMedia,
    open: async () => {
      openMicrophone(stream);
      await flushPromises();
    }
  };
};

test.beforeEach(() => {
  FakeAudioContext.instances = [];
});

test('reports the average microphone level', async t => {
  const microphone = givenMicrophone();
  const onLevel = sinon.fake();

  startAudioLevelMeter({deviceId: 'usb-mic', onLevel, onError: sinon.fake()});
  await microphone.open();
  FakeAudioContext.instances[0].processor.onaudioprocess();

  t.deepEqual(microphone.getUserMedia.lastCall.lastArg, {audio: {deviceId: 'usb-mic'}});
  t.is(onLevel.lastCall.lastArg, 40);
});

test('stopping the meter releases the microphone', async t => {
  const microphone = givenMicrophone();

  const meter = startAudioLevelMeter({deviceId: 'usb-mic', onLevel: sinon.fake(), onError: sinon.fake()});
  await microphone.open();
  meter.stop();

  t.is(microphone.track.stop.callCount, 1);
  t.is(FakeAudioContext.instances[0].close.callCount, 1);
});

test('stopping the meter before the microphone opens still releases it', async t => {
  const microphone = givenMicrophone();

  const meter = startAudioLevelMeter({deviceId: 'usb-mic', onLevel: sinon.fake(), onError: sinon.fake()});
  meter.stop();
  await microphone.open();

  t.is(microphone.track.stop.callCount, 1);
  t.is(FakeAudioContext.instances.length, 0);
});
