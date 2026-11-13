import path from 'node:path';
import {app} from 'electron';
import execa from 'execa';

// Runs native/kap-helper.swift, built for Apple Silicon by `pnpm build-native`.

export type AudioInput = {
  id: string;
  name: string;
  isBuiltIn: boolean;
};

export type HelperWindow = {
  pid: number;
  ownerName: string;
  name: string;
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  appPath?: string;
};

export type OpenWithApp = {
  url: string;
  isDefault: boolean;
};

// Packaged builds ship the helper in Contents/Resources (see "extraResources" in package.json).
const getHelperPath = () => app.isPackaged
  ? path.join(process.resourcesPath, 'kap-helper')
  : path.join(__dirname, '..', '..', 'native', 'build', 'kap-helper');

const runHelper = async (args: string[]) => {
  const {stdout} = await execa(getHelperPath(), args);
  return JSON.parse(stdout);
};

const runHelperSync = (args: string[]) => JSON.parse(execa.sync(getHelperPath(), args).stdout);

export const sortAudioInputs = (devices: AudioInput[]) => devices.toSorted((a, b) => {
  if (a.isBuiltIn !== b.isBuiltIn) {
    return a.isBuiltIn ? -1 : 1;
  }

  return a.name.localeCompare(b.name);
});

const toAudioInputs = ({defaultId, devices}: {defaultId?: string | undefined; devices: AudioInput[]}) => ({
  defaultId: defaultId ?? undefined,
  devices: sortAudioInputs(devices),
});

export const getAudioInputs = async () => toAudioInputs(await runHelper(['audio-inputs']));

export const getAudioInputsSync = () => toAudioInputs(runHelperSync(['audio-inputs']));

// One entry per app: its first titled window, or its first window when none has a title.
export const pickOneWindowPerApp = <Window extends {ownerName: string; name: string}>(windows: Window[]) => windows.filter((window, index) => {
  const firstTitled = windows.findIndex(other => other.name && other.ownerName === window.ownerName);
  const first = windows.findIndex(other => other.ownerName === window.ownerName);
  return index === (firstTitled === -1 ? first : firstTitled);
});

export const getWindows = async (): Promise<HelperWindow[]> => pickOneWindowPerApp(await runHelper(['windows']));

export const getAppsForExtensionsSync = (extensions: string[]): Record<string, OpenWithApp[]> => runHelperSync(['apps-for-extensions', ...extensions]);
