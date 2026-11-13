import test from 'ava';
import {getSelectedAudioInput} from '../main/common/audio-input';
import {defaultInputDeviceId} from '../main/common/constants';

const devices = [{id: 'usb-mic', name: 'USB Mic'}];

test('keeps a saved device that is still connected', t => {
  t.deepEqual(
    getSelectedAudioInput({savedId: 'usb-mic', devices, canRecordAudio: true}),
    {selectedId: 'usb-mic', shouldResetSaved: false},
  );
});

test('resets a saved device that is no longer connected', t => {
  t.deepEqual(
    getSelectedAudioInput({savedId: 'unplugged-mic', devices, canRecordAudio: true}),
    {selectedId: defaultInputDeviceId, shouldResetSaved: true},
  );
});

test('keeps the saved device when Kap cannot list devices without microphone access', t => {
  t.deepEqual(
    getSelectedAudioInput({savedId: 'usb-mic', devices: [], canRecordAudio: false}),
    {selectedId: defaultInputDeviceId, shouldResetSaved: false},
  );
});
