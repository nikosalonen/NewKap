import {execa} from 'execa';
import {timestampToMilliseconds} from '../../main/common/time';

const ffmpegPath = require('ffmpeg-static');

const getDuration = (text: string): number => {
  const durationString = /Duration: ([\d.:]*)/.exec(text)?.[1];
  return timestampToMilliseconds(durationString) / 1000;
};

const getEncoding = (text: string) => /Stream.*Video: (.*?)[ ,]/.exec(text)?.[1];

const getFps = (text: string) => {
  const fpsString = /, ([\d.]+) fps/.exec(text)?.[1];
  return Number.parseFloat(fpsString!);
};

const getSize = (text: string) => {
  const sizeText = /Video:.*?, (\d*x\d*)/.exec(text)?.[1] ?? '';
  const [width = '', height = ''] = sizeText.split('x', 2);
  return {
    width: Number.parseFloat(width),
    height: Number.parseFloat(height),
  };
};

const getHasAudio = (text: string) => /Stream #.*: Audio/.test(text);

export const getVideoMetadata = async (path: string): Promise<{
  duration: number;
  encoding: string;
  fps: number;
  size: {width: number; height: number};
  hasAudio: boolean;
}> => {
  try {
    await execa(ffmpegPath, ['-i', path]);
  } catch (error) {
    const {stderr} = error as any;
    return {
      duration: getDuration(stderr),
      encoding: getEncoding(stderr)!,
      fps: getFps(stderr),
      size: getSize(stderr),
      hasAudio: getHasAudio(stderr),
    };
  }

  // `ffmpeg -i` with no output file always exits with an error.
  throw new Error('Expected ffmpeg to fail without an output file');
};
