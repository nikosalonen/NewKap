import path from 'node:path';
import {fileURLToPath} from 'node:url';
import execa from 'execa';
import type {ShareServiceContext} from '../service-context';
import {getFormatExtension} from '../../common/constants';
import type {Format} from '../../common/types';
import {getAppsForExtensionsSync} from '../../utils/native-helper';
import type {OpenWithApp} from '../../utils/native-helper';

const action = async (context: ShareServiceContext & {appUrl: string}) => {
  const filePath = await context.filePath();
  await execa('/usr/bin/open', ['-a', fileURLToPath(context.appUrl), filePath]);
};

export type App = {
  url: string;
  isDefault: boolean;
  icon?: string;
  name: string;
};

const openWithFormats = ['mp4', 'gif', 'apng', 'webm', 'av1', 'hevc'] as Format[];

const loadAppsByExtension = (): Record<string, OpenWithApp[]> => {
  const extensions = [...new Set(openWithFormats.map(format => getFormatExtension(format)))];

  try {
    return getAppsForExtensionsSync(extensions);
  } catch (error) {
    console.error('Could not list the apps that open exported files:', error);
    return {};
  }
};

const appsByExtension = loadAppsByExtension();

const getAppsForFormat = (format: Format): App[] => (appsByExtension[getFormatExtension(format)] ?? [])
  .map(app => ({...app, name: decodeURI(path.parse(app.url).name)}))
  .filter(app => !['Kap', 'Kap Beta'].includes(app.name))
  .toSorted((a, b) => a.isDefault === b.isDefault ? Number(b.name === 'Gifski') - Number(a.name === 'Gifski') : Number(b.isDefault) - Number(a.isDefault));

const appsForFormat = openWithFormats
  .map(format => ({
    format,
    apps: getAppsForFormat(format),
  }))
  .filter(({apps}) => apps.length > 0);

export const apps = new Map(appsForFormat.map(({format, apps}) => [format, apps]));

export const shareServices = [{
  title: 'Open With',
  formats: apps.keys().toArray(),
  action,
}];
