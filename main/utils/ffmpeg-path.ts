import ffmpeg from 'ffmpeg-static';
import util from 'electron-util';

// The ffmpeg-static package exports null on platforms it has no binary for.
if (!ffmpeg) {
  throw new Error('ffmpeg-static has no ffmpeg binary for this platform');
}

const ffmpegPath = util.fixPathForAsarUnpack(ffmpeg);

export default ffmpegPath;
