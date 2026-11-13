import {defaultInputDeviceId} from './constants';

// Picks the input device the Audio Source menu shows as selected.
// Without microphone access the device list is empty, so the saved device is kept rather than reset.
export const getSelectedAudioInput = ({savedId, devices, canRecordAudio}: {
  savedId?: string;
  devices: Array<{id: string}>;
  canRecordAudio: boolean;
}) => {
  if (devices.some(device => device.id === savedId)) {
    return {selectedId: savedId, shouldResetSaved: false};
  }

  return {selectedId: defaultInputDeviceId, shouldResetSaved: canRecordAudio};
};
