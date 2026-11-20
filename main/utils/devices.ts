import {hasMicrophoneAccess} from '../common/system-permissions';
import {settings} from '../common/settings';
import {defaultInputDeviceId} from '../common/constants';
import {getAudioInputs, getAudioInputsSync} from './native-helper';
import {getRecorderAudioDevices} from './screen-recorder';

let cachedDevices: Array<{id: string; name: string}> | undefined;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10_000;

let cachedDefaultDeviceId: string | undefined;
let defaultDeviceCacheTimestamp = 0;
const DEFAULT_DEVICE_CACHE_TTL = 30_000;

const setCachedDefaultDeviceId = (deviceId: string | undefined) => {
  cachedDefaultDeviceId = deviceId;
  defaultDeviceCacheTimestamp = Date.now();
};

export const getAudioDevices = async () => {
  if (!hasMicrophoneAccess()) {
    return [];
  }

  if (cachedDevices && (Date.now() - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedDevices;
  }

  try {
    const {devices} = await getAudioInputs();

    cachedDevices = devices.map(device => ({id: device.id, name: device.name}));
    cacheTimestamp = Date.now();
    return cachedDevices;
  } catch (error) {
    try {
      const devices = await getRecorderAudioDevices();

      if (!Array.isArray(devices)) {
        console.error('Audio device error:', error, 'kap-recorder returned:', devices);
        return cachedDevices ?? [];
      }

      cachedDevices = devices;
      cacheTimestamp = Date.now();
      return devices;
    } catch (fallbackError) {
      console.error('Audio device fallback also failed:', fallbackError);
      return cachedDevices ?? [];
    }
  }
};

export const getDefaultInputDevice = () => {
  try {
    const {defaultId, devices} = getAudioInputsSync();
    const device = devices.find(input => input.id === defaultId);

    if (!device) {
      return undefined;
    }

    setCachedDefaultDeviceId(device.id);
    return {
      id: device.id,
      name: device.name,
    };
  } catch {
    return undefined;
  }
};

const getDefaultInputDeviceId = async () => {
  try {
    const {defaultId} = await getAudioInputs();
    return defaultId;
  } catch {
    return undefined;
  }
};

export const getCachedAudioDeviceId = () => {
  if (!hasMicrophoneAccess()) {
    return undefined;
  }

  const audioInputDeviceId = settings.get('audioInputDeviceId', defaultInputDeviceId);

  if (audioInputDeviceId === defaultInputDeviceId) {
    return cachedDefaultDeviceId && (Date.now() - defaultDeviceCacheTimestamp) < DEFAULT_DEVICE_CACHE_TTL ? cachedDefaultDeviceId : undefined;
  }

  return audioInputDeviceId;
};

const getFirstAudioDeviceId = async () => {
  const [firstDevice] = await getAudioDevices();
  return firstDevice?.id;
};

export const getRecordingAudioDeviceId = async () => {
  const cachedAudioDeviceId = getCachedAudioDeviceId();
  if (cachedAudioDeviceId) {
    return cachedAudioDeviceId;
  }

  if (!hasMicrophoneAccess()) {
    return undefined;
  }

  const audioInputDeviceId = settings.get('audioInputDeviceId', defaultInputDeviceId);
  if (audioInputDeviceId !== defaultInputDeviceId) {
    return audioInputDeviceId;
  }

  const deviceId = await getDefaultInputDeviceId() ?? await getFirstAudioDeviceId();
  setCachedDefaultDeviceId(deviceId);
  return deviceId;
};

export const getSelectedInputDeviceId = () => {
  const audioInputDeviceId = settings.get('audioInputDeviceId', defaultInputDeviceId);

  if (audioInputDeviceId === defaultInputDeviceId) {
    const device = getDefaultInputDevice();
    return device?.id;
  }

  return audioInputDeviceId;
};

export const initializeDevices = async () => {
  try {
    const audioInputDeviceId = settings.get('audioInputDeviceId');

    if (hasMicrophoneAccess()) {
      const [devices] = await Promise.all([
        getAudioDevices(),
        getRecordingAudioDeviceId(),
      ]);

      if (devices.every((device: any) => device.id !== audioInputDeviceId)) {
        settings.set('audioInputDeviceId', defaultInputDeviceId);
      }
    }
  } catch (error) {
    console.error('Device initialization failed (non-fatal):', error);
  }
};
