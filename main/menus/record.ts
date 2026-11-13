import {Menu} from 'electron';
import {pauseRecording, resumeRecording, stopRecording} from '../aperture';
import {settings} from '../common/settings';
import {formatTime} from '../common/time';
import {getCurrentDurationStart, getOverallDuration} from '../utils/track-duration';
import {MenuItemId, type MenuOptions} from './utils';

const menuAccelerator = (shortcut: string) => shortcut || undefined;

const getDurationLabel = () => {
  const durationStart = getCurrentDurationStart();
  const elapsedMs = durationStart <= 0 ? getOverallDuration() : getOverallDuration() + (Date.now() - durationStart);
  return formatTime(elapsedMs / 1000, undefined);
};

const getDurationMenuItem = () => ({
  id: MenuItemId.duration,
  label: getDurationLabel(),
  enabled: false,
});

const getStopRecordingMenuItem = () => ({
  id: MenuItemId.stopRecording,
  label: 'Stop',
  accelerator: menuAccelerator(settings.get('shortcuts.stopRecording')),
  click: stopRecording,
});

const getPauseRecordingMenuItem = () => ({
  id: MenuItemId.pauseRecording,
  label: 'Pause',
  accelerator: menuAccelerator(settings.get('shortcuts.pauseRecording')),
  click: pauseRecording,
});

const getResumeRecordingMenuItem = () => ({
  id: MenuItemId.resumeRecording,
  label: 'Resume',
  accelerator: menuAccelerator(settings.get('shortcuts.pauseRecording')),
  click: resumeRecording,
});

export const getRecordMenuTemplate = (isPaused: boolean): MenuOptions => [
  getDurationMenuItem(),
  {
    type: 'separator',
  },
  isPaused ? getResumeRecordingMenuItem() : getPauseRecordingMenuItem(),
  getStopRecordingMenuItem(),
  {
    type: 'separator',
  },
  {
    role: 'quit',
    accelerator: 'Command+Q',
  },
];

export const getRecordMenu = async (isPaused: boolean) => Menu.buildFromTemplate(getRecordMenuTemplate(isPaused));
