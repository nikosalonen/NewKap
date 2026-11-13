import util from 'electron-util';
import execa from 'execa';
import moment from 'moment';
import PCancelable from 'p-cancelable';
import tempy from 'tempy';
import path from 'path';

import {conditionalArgs, extractProgressFromStderr} from './utils';
import {settings} from '../common/settings';

import ffmpegPath from '../utils/ffmpeg-path';

// Gifsicle 7 is an ES module; its default export is the binary path.
const {default: gifsicle} = require('gifsicle');
const gifsiclePath = util.fixPathForAsarUnpack(gifsicle);

enum Mode {
  convert,
  compress
}

const modes = new Map([
  [Mode.convert, ffmpegPath],
  [Mode.compress, gifsiclePath]
]);

export interface ProcessOptions {
  startTime?: number;
  endTime?: number;
  onProgress?: (progress: number, estimate?: string) => void;
}

const createProcess = (mode: Mode) => {
  const program = modes.get(mode)!;

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  return (outputPath: string, options: ProcessOptions, args: string[]) => {
    const {
      startTime = 0,
      endTime = 0,
      onProgress
    } = options;

    return new PCancelable<string>((resolve, reject, onCancel) => {
      const runner = execa(program, args);
      const conversionStartTime = Date.now();

      onCancel(() => {
        runner.kill();
      });

      const durationMs = moment.duration(endTime - startTime, 'seconds').asMilliseconds();

      let stderr = '';
      runner.stderr?.setEncoding('utf8');
      runner.stderr?.on('data', data => {
        stderr += data;

        const progressData = extractProgressFromStderr(data, conversionStartTime, durationMs);

        if (progressData) {
          onProgress?.(progressData.progress, progressData.estimate);
        }
      });

      const failWithError = (reason: unknown) => {
        reject(reason);
      };

      runner.on('error', failWithError);

      runner.on('exit', code => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          failWithError(new Error(`${program} exited with code: ${code ?? 0}\n\n${stderr}`));
        }
      });

      runner.catch(failWithError);
    });
  };
};

export const convert = createProcess(Mode.convert);
const compressFunction = createProcess(Mode.compress);

// eslint-disable-next-line @typescript-eslint/promise-function-async
export const compress = (outputPath: string, options: ProcessOptions, args: string[]) => {
  const useLossy = settings.get('lossyCompression', false);

  return compressFunction(
    outputPath,
    options,
    conditionalArgs(args, {args: ['--lossy=50'], if: useLossy})
  );
};

export const mute = PCancelable.fn(async (inputPath: string, onCancel: PCancelable.OnCancelFunction) => {
  const mutedPath = tempy.file({extension: path.extname(inputPath)});

  const converter = convert(mutedPath, {}, [
    '-i',
    inputPath,
    '-an',
    '-vcodec',
    'copy',
    mutedPath
  ]);

  onCancel(() => {
    converter.cancel();
  });

  return converter;
});
