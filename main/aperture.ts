import {windowManager} from './windows/manager';
import {
  setRecordingTray,
  setPausedTray,
  setStartingTray,
  resetTray,
} from './tray';
import {setCropperShortcutAction} from './global-accelerators';
import {settings} from './common/settings';
import {plugins} from './plugins';
import {getRecordingAudioDeviceId} from './utils/devices';
import {ScreenRecorder, supportedVideoCodecs} from './utils/screen-recorder';
import {showError} from './utils/errors';
import {RecordServiceContext, type RecordServiceState} from './plugins/service-context';
import {setCurrentRecording, updatePluginState, stopCurrentRecording} from './recording-history';
import {Recording} from './video';
import {Encoding, type ApertureOptions, type StartRecordingOptions} from './common/types';
import type {InstalledPlugin} from './plugins/plugin';
import type {RecordService, RecordServiceHook} from './plugins/service';
import {
  getCurrentDurationStart,
  getOverallDuration,
  setCurrentDurationStart,
  setOverallDuration,
} from './utils/track-duration';

let screenRecorder = new ScreenRecorder();
const MAX_RECORDING_RETRIES = 2;
const recordingCodecs = {
  standard: Encoding.h264,
  high: Encoding.hevc,
  maximum: Encoding.proRes422,
};

let recordingPlugins: Array<{plugin: InstalledPlugin; service: RecordService}> = [];
const serviceState = new Map<string, RecordServiceState>();
let apertureOptions: ApertureOptions;
let recordingName: string | undefined;
let past: number | undefined;

export const isPast = () => Boolean(past);

const setRecordingName = (name: string) => {
  recordingName = name;
};

const serializeEditPluginState = () => {
  const result: Record<string, Record<string, Record<string, unknown> | undefined>> = {};

  for (const {plugin, service} of recordingPlugins) {
    const pluginState = result[plugin.name] ?? {};
    pluginState[service.title] = serviceState.get(service.title)?.persistedState;
    result[plugin.name] = pluginState;
  }

  return result;
};

const callPlugins = async (method: RecordServiceHook) => Promise.all(recordingPlugins.map(async ({plugin, service}) => {
  if (typeof service[method] === 'function') {
    try {
      await service[method]?.(
        new RecordServiceContext({
          plugin,
          apertureOptions,
          state: serviceState.get(service.title) ?? {},
          setRecordingName,
        }),
      );
    } catch (error) {
      showError(error as any, {title: `Something went wrong while using the plugin \u{201C}${plugin.prettyName}\u{201D}`, plugin});
    }
  }
}));

const cleanup = async () => {
  windowManager.cropper?.close();
  resetTray();

  await callPlugins('didStopRecording');
  serviceState.clear();

  setCropperShortcutAction();
};

export const startRecording = async (options: StartRecordingOptions) => {
  if (past) {
    return;
  }

  past = Date.now();
  recordingName = undefined;

  windowManager.preferences?.close();
  windowManager.cropper?.disable();

  // Use starting tray state instead of disabling tray completely
  setStartingTray();

  // ScreenCaptureKit takes the crop in points from the top-left corner of the screen,
  // which is how the cropper reports it.
  const {cropperBounds, displayId} = options;

  const {
    record60fps,
    showCursor,
    highlightClicks,
    recordAudio,
    recordingQuality,
  } = settings.store;

  const requestedCodec = recordingCodecs[recordingQuality];
  const videoCodec = supportedVideoCodecs.has(requestedCodec) ? requestedCodec : Encoding.h264;

  apertureOptions = {
    fps: record60fps ? 60 : 30,
    cropArea: cropperBounds,
    showCursor,
    highlightClicks,
    screenId: displayId,
    videoCodec,
  };

  const audioDeviceIdPromise = recordAudio ? getRecordingAudioDeviceId() : Promise.resolve(undefined);

  recordingPlugins = plugins
    .recordingPlugins
    .flatMap(
      plugin => {
        const {validServices} = plugin.config;
        return plugin.recordServicesWithStatus
          .filter(({title, isEnabled}) => isEnabled && validServices.includes(title))
          .map(service => ({plugin, service}));
      },
    );

  for (const {service} of recordingPlugins) {
    serviceState.set(service.title, {persistedState: {}});
  }

  const audioDeviceId = await audioDeviceIdPromise;
  if (audioDeviceId) {
    apertureOptions.audioDeviceId = audioDeviceId;
  }

  console.log(`Collected settings after ${(Date.now() - past) / 1000}s`);

  await callPlugins('willStartRecording');

  let lastError: any;
  for (let attempt = 1; attempt <= MAX_RECORDING_RETRIES; attempt++) {
    try {
      const filePath = await screenRecorder.startRecording(apertureOptions);
      setOverallDuration(0);
      setCurrentDurationStart(Date.now());

      setCurrentRecording({
        filePath,
        name: recordingName,
        apertureOptions,
        plugins: serializeEditPluginState(),
      });
      lastError = undefined;
      break;
    } catch (error: any) {
      lastError = error;
      if (error?.code === 'RECORDER_TIMEOUT' && attempt < MAX_RECORDING_RETRIES) {
        console.log(`Recording attempt ${attempt} timed out, retrying...`);
        screenRecorder = new ScreenRecorder();
        continue;
      }
    }
  }

  if (lastError) {
    showError(lastError, {title: 'Recording error'});
    past = undefined;
    cleanup();
    return;
  }

  const startTime = (Date.now() - past) / 1000;

  console.log(`Started recording after ${startTime}s`);
  windowManager.cropper?.setRecording();
  setRecordingTray();
  setCropperShortcutAction(stopRecording);
  past = Date.now();

  screenRecorder.finished?.catch((error: unknown) => {
    if (!past) {
      return;
    }

    showError(error as Error, {title: 'Recording error'});
    past = undefined;
    cleanup();
  });

  await callPlugins('didStartRecording');
  updatePluginState(serializeEditPluginState());
};

export const stopRecording = async () => {
  if (!past) {
    return;
  }

  console.log(`Stopped recording after ${(Date.now() - past) / 1000}s`);
  past = undefined;

  let filePath;

  try {
    filePath = await screenRecorder.stopRecording();
    setOverallDuration(0);
    setCurrentDurationStart(0);
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
    return;
  }

  try {
    cleanup();
  } finally {
    const recording = new Recording({
      filePath,
      title: recordingName,
      apertureOptions,
    });
    await recording.openEditorWindow();

    stopCurrentRecording(recordingName);
  }
};

export const stopRecordingWithNoEdit = async () => {
  if (!past) {
    return;
  }

  console.log(`Stopped recording after ${(Date.now() - past) / 1000}s`);
  past = undefined;

  try {
    await Promise.race([
      screenRecorder.stopRecording(),
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Stop recording timed out'));
        }, 5000);
      }),
    ]);
    setOverallDuration(0);
    setCurrentDurationStart(0);
  } catch (error) {
    console.error('Error stopping recording:', error);
    cleanup();
    return;
  }

  try {
    cleanup();
  } finally {
    stopCurrentRecording(recordingName);
  }
};

export const pauseRecording = async () => {
  if (!past) {
    return;
  }

  try {
    const isPaused = await screenRecorder.isPaused();
    if (isPaused) {
      return;
    }

    await screenRecorder.pause();
    setOverallDuration(getOverallDuration() + (Date.now() - getCurrentDurationStart()));
    setCurrentDurationStart(0);
    setPausedTray();
    console.log(`Paused recording after ${(Date.now() - past) / 1000}s`);
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
  }
};

export const resumeRecording = async () => {
  if (!past) {
    return;
  }

  try {
    const isPaused = await screenRecorder.isPaused();
    if (!isPaused) {
      return;
    }

    await screenRecorder.resume();
    setCurrentDurationStart(Date.now());
    setRecordingTray();
    console.log(`Resume recording after ${(Date.now() - past) / 1000}s`);
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
  }
};

export const togglePauseRecording = async () => {
  if (!past) {
    return;
  }

  try {
    await (await screenRecorder.isPaused() ? resumeRecording() : pauseRecording());
  } catch (error) {
    showError(error as any, {title: 'Recording error'});
    cleanup();
  }
};
