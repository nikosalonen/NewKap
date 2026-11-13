import {defaultInputDeviceId} from './constants';

// Picks the input device the Audio Source menu shows as selected.
// Without microphone access the device list is empty, so the saved device is kept rather than reset.
export const getSelectedAudioInput = ({savedId, devices, canRecordAudio}: {
  savedId?: string;
  devices: Array<{id: string}>;
  canRecordAudio: boolean;
}) => devices.some(device => device.id === savedId) ? {selectedId: savedId, shouldResetSaved: false} : {selectedId: defaultInputDeviceId, shouldResetSaved: canRecordAudio};
