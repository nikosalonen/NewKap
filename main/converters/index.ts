import path from 'node:path';
import tempy from 'tempy';
import PCancelable, {type OnCancelFunction} from 'p-cancelable';
import type {Except} from 'type-fest';
import {Encoding, type Format} from '../common/types';
import {getFormatExtension} from '../common/constants';
import {plugins} from '../plugins';
import {EditServiceContext} from '../plugins/service-context';
import {settings} from '../common/settings';
import h264Converters, {crop as h264Crop} from './h264';
import type {ConvertOptions} from './utils';
import {convert} from './process';

const converters = new Map([
  [Encoding.h264, h264Converters],
]);

const croppingHandlers = new Map([
  [Encoding.h264, h264Crop],
]);

export const convertTo = (
  format: Format,
  options: Except<ConvertOptions, 'outputPath'> & {defaultFileName: string},
  encoding: Encoding = Encoding.h264,
) => { // eslint-disable-line @typescript-eslint/promise-function-async -- returns a PCancelable; async would wrap it in a plain promise
  if (!converters.has(encoding)) {
    throw new Error(`Unsupported encoding: ${encoding}`);
  }

  const converter = converters.get(encoding)?.get(format);

  if (!converter) {
    throw new Error(`Unsupported file format for ${encoding}: ${format}`);
  }

  const conversionOptions = {
    outputPath: path.join(tempy.directory(), `${options.defaultFileName}.${getFormatExtension(format)}`),
    ...options,
  };

  if (options.editService) {
    const croppingHandler = croppingHandlers.get(encoding);

    if (!croppingHandler) {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }

    return convertWithEditPlugin({
      ...conversionOptions, format, croppingHandler, converter,
    });
  }

  return converter(conversionOptions);
};

const convertWithEditPlugin = PCancelable.fn(
  async (
    options: ConvertOptions & {
      format: Format;
      converter: (options: ConvertOptions) => PCancelable<string>;
      croppingHandler: (options: ConvertOptions) => PCancelable<string>;
    },
    onCancel: OnCancelFunction,
  ) => {
    let croppedPath: string;
    let isCanceled = false;

    if (options.shouldCrop) {
      croppedPath = tempy.file({extension: path.extname(options.inputPath)});

      options.onProgress('Cropping', 0);

      const cropProcess = options.croppingHandler({
        ...options,
        outputPath: croppedPath,
      });

      onCancel(() => {
        isCanceled = true;
        cropProcess.cancel();
      });

      await cropProcess;

      if (isCanceled) {
        return '';
      }
    } else {
      croppedPath = options.inputPath;
    }

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const convertFunction = (args: string[], text = 'Converting') => new PCancelable<void>(async (resolve, reject, onConvertCancel) => {
      try {
        const process = convert(
          '', {
            startTime: options.startTime,
            endTime: options.endTime,
            onProgress(progress, estimate) {
              options.onProgress(text, progress, estimate);
            },
          }, args,
        );

        onConvertCancel(() => {
          process.cancel();
        });
        await process;
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    const editPath = tempy.file({extension: path.extname(croppedPath)});

    const editPlugin = plugins.editPlugins.find(plugin => plugin.name === options.editService?.pluginName);

    const editService = editPlugin?.editServices.find(service => service.title === options.editService?.serviceTitle);

    if (!editService || !editPlugin) {
      throw new Error(`Edit service ${options.editService?.serviceTitle} not found`);
    }

    const editProcess = editService.action(
      new EditServiceContext({
        plugin: editPlugin,
        onCancel: options.onCancel,
        onProgress: options.onProgress,
        convert: convertFunction,
        inputPath: croppedPath,
        outputPath: editPath,
        exportOptions: {
          width: options.width,
          height: options.height,
          format: options.format,
          fps: options.fps,
          duration: options.endTime - options.startTime,
          isMuted: options.shouldMute,
          loop: settings.get('loopExports'),
        },
      }),
    );

    onCancel(() => {
      isCanceled = true;
      // @ts-expect-error -- edit plugins may return a PCancelable, which has cancel()
      if (editProcess.cancel && typeof editProcess.cancel === 'function') {
        (editProcess as PCancelable<void>).cancel();
      }
    });

    await editProcess;

    if (isCanceled) {
      return '';
    }

    const conversionProcess = options.converter({
      ...options,
      shouldCrop: false,
      inputPath: editPath,
    });

    onCancel(() => {
      conversionProcess.cancel();
    });

    return conversionProcess;
  },
);
