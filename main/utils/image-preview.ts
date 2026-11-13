/* eslint-disable @stylistic/array-element-newline -- each ffmpeg flag stays on one line with its value */

import {BrowserWindow, dialog} from 'electron';
import fs from 'node:fs';
import execa from 'execa';
import tempy from 'tempy';
import type {Video} from '../video';
import {generateTimestampedName} from './timestamped-name';
import ffmpegPath from './ffmpeg-path';

const getBase64 = async (imagePath: string) => {
  const image = await fs.promises.readFile(imagePath);
  return `data:image/jpeg;base64,${image.toString('base64')}`;
};

export const generatePreviewImage = async (filePath: string): Promise<{path: string; data: string} | undefined> => {
  const previewPath = tempy.file({extension: '.jpg'});

  try {
    await execa(ffmpegPath, [
      '-ss', '0',
      '-i', filePath,
      '-t', '1',
      '-vframes', '1',
      '-f', 'image2',
      previewPath,
    ]);
  } catch {
    return;
  }

  try {
    return {
      path: previewPath,
      data: await getBase64(previewPath),
    };
  } catch {
    return {
      path: previewPath,
      data: '',
    };
  }
};

export const saveSnapshot = async (video: Video, time: number) => {
  const {filePath: outputPath} = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, {
    defaultPath: generateTimestampedName('Snapshot', '.jpg'),
  });

  if (outputPath) {
    await execa(ffmpegPath, [
      '-i', video.filePath,
      '-ss', time.toString(),
      '-vframes', '1',
      outputPath,
    ]);
  }
};
