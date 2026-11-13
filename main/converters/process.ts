import path from 'node:path';
import {execa, ExecaError} from 'execa';
import PCancelable from 'p-cancelable';
import tempy from 'tempy';
import {settings} from '../common/settings';
import ffmpegPath from '../utils/ffmpeg-path';
import {fixPathForAsarUnpack} from '../utils/asar';
import {conditionalArgs, extractProgressFromStderr} from './utils';

// Gifsicle 7 is an ES module; its default export is the binary path.
const {default: gifsicle} = require('gifsicle');

const gifsiclePath = fixPathForAsarUnpack(gifsicle);
const textDecoder = new TextDecoder();

enum Mode {
  convert,
  compress,
}

const modes = new Map([
  [Mode.convert, ffmpegPath],
  [Mode.compress, gifsiclePath],
]);

export type ProcessOptions = {
  startTime?: number;
  endTime?: number;
  onProgress?: (progress: number, estimate?: string) => void;
};

const createProcess = (mode: Mode) => {
  const program = modes.get(mode)!;

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  return (outputPath: string, options: ProcessOptions, args: string[]) => {
    const {
      startTime = 0,
      endTime = 0,
      onProgress,
    } = options;

    return new PCancelable<string>((resolve, reject, onCancel) => {
      const runner = execa(program, args);
      const conversionStartTime = Date.now();

      onCancel(() => {
        runner.kill();
      });

      const durationMs = (endTime - startTime) * 1000;

      // Progress lines are plain ASCII, so each chunk can be read as text on its own.
      // The full stderr for error messages comes decoded from execa.
      runner.stderr.on('data', (data: Uint8Array) => {
        const progressData = extractProgressFromStderr(textDecoder.decode(data), conversionStartTime, durationMs);

        if (progressData) {
          onProgress?.(progressData.progress, progressData.estimate);
        }
      });

      runner.then(
        () => {
          resolve(outputPath);
        },
        (error: unknown) => {
          if (error instanceof ExecaError && error.exitCode !== undefined) {
            reject(new Error(`${program} exited with code: ${error.exitCode}\n\n${error.stderr}`));
          } else {
            reject(error);
          }
        },
      );
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
    conditionalArgs(args, {args: ['--lossy=50'], if: useLossy}),
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
    mutedPath,
  ]);

  onCancel(() => {
    converter.cancel();
  });

  return converter;
});
