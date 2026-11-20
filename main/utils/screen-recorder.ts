import {EventEmitter, once} from 'node:events';
import readline from 'node:readline';
import {pathToFileURL} from 'node:url';
import {execa, type ResultPromise} from 'execa';
import tempy from 'tempy';
import {Encoding, type ApertureOptions} from '../common/types';
import {getNativeBinaryPath} from './native-binary';

// Records the screen with kap-recorder (native/recorder), which uses ScreenCaptureKit.
// Kap writes commands to its stdin and reads events from its stdout, one per line.
// native/recorder/Sources/KapRecorder/KapRecorder.swift describes the protocol.

const startTimeoutMs = 30_000;
const commandTimeoutMs = 10_000;
// Finishing the file of a long recording can take a moment. Kill the recorder only if it hangs.
const stopTimeoutMs = 30_000;

// The recorder takes AVFoundation codec IDs.
const codecIds = new Map<Encoding, string>([
  [Encoding.h264, 'avc1'],
  [Encoding.hevc, 'hvc1'],
  [Encoding.proRes422, 'apcn'],
  [Encoding.proRes4444, 'ap4h'],
]);

export const supportedVideoCodecs: ReadonlySet<Encoding> = new Set(codecIds.keys());

// ProRes fits only in a QuickTime file.
export const getRecordingExtension = (videoCodec = Encoding.h264) =>
  videoCodec === Encoding.proRes422 || videoCodec === Encoding.proRes4444 ? 'mov' : 'mp4';

export const getRecorderOptions = (options: ApertureOptions, filePath: string) => {
  const {x, y, width, height} = options.cropArea;

  return {
    destination: pathToFileURL(filePath).href,
    framesPerSecond: options.fps,
    // In points from the top-left corner of the screen, as ScreenCaptureKit takes it.
    cropRect: [[x, y], [width, height]],
    // Clicks are highlighted around the cursor, so it has to show.
    showCursor: options.showCursor || options.highlightClicks,
    highlightClicks: options.highlightClicks,
    screenId: options.screenId,
    audioDeviceId: options.audioDeviceId,
    videoCodec: codecIds.get(options.videoCodec ?? Encoding.h264),
  };
};

// The recorder explains failures on stderr. That is the useful part of execa's error,
// which also repeats the whole command line.
const toRecorderError = (error: unknown) => {
  const {stderr, shortMessage} = error as {stderr?: unknown; shortMessage?: string};
  const message = typeof stderr === 'string' && stderr.trim() ? stderr.trim() : shortMessage ?? String(error);
  return new Error(message, {cause: error});
};

const timeoutError = (message: string) => Object.assign(new Error(message), {code: 'RECORDER_TIMEOUT'});

export class ScreenRecorder {
  // Settles when kap-recorder exits: resolves after a clean stop and rejects when the recording failed.
  finished?: Promise<void>;
  private subprocess?: ResultPromise | undefined;
  private filePath?: string;
  private readonly events = new EventEmitter();

  /**
  Starts recording to a new temporary file and resolves with its path once the first frame is captured.
  */
  async startRecording(options: ApertureOptions) {
    if (this.subprocess) {
      throw new Error('A recording is already running');
    }

    const filePath = tempy.file({extension: getRecordingExtension(options.videoCodec)});
    const subprocess = execa(
      getNativeBinaryPath('kap-recorder'),
      ['record', JSON.stringify(getRecorderOptions(options, filePath))],
      {forceKillAfterDelay: stopTimeoutMs},
    );

    this.subprocess = subprocess;
    this.filePath = filePath;
    this.finished = subprocess.then(
      () => undefined,
      (error: unknown) => {
        throw toRecorderError(error);
      },
    );
    // Callers handle `finished` once the recording runs. Until then, a failure surfaces through startRecording().
    this.finished.catch(() => undefined);

    readline.createInterface({input: subprocess.stdout}).on('line', line => {
      const [event, value] = line.split(' ', 2);
      this.events.emit(event!, value);
    });

    try {
      await this.waitFor('onStart', startTimeoutMs, 'Could not start recording within 30 seconds');
    } catch (error) {
      subprocess.kill();
      this.subprocess = undefined;
      throw error;
    }

    return filePath;
  }

  async pause() {
    await this.send('pause', 'onPause');
  }

  // Resolves once kap-recorder has captured a frame again.
  async resume() {
    await this.send('resume', 'onResume');
  }

  async isPaused() {
    return await this.send('isPaused', 'isPaused') === 'true';
  }

  /**
  Stops the recording and resolves with the file path once kap-recorder has finished the file.
  */
  async stopRecording() {
    const subprocess = this.getRunningSubprocess();
    subprocess.kill('SIGTERM');

    try {
      await this.finished;
    } finally {
      this.subprocess = undefined;
    }

    return this.filePath!;
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async -- Returns the subprocess itself, which execa also makes a promise.
  private getRunningSubprocess() {
    if (!this.subprocess) {
      throw new Error('No recording is running');
    }

    return this.subprocess;
  }

  private async send(command: string, answer: string) {
    const subprocess = this.getRunningSubprocess();
    const answered = this.waitFor(answer, commandTimeoutMs, `The recorder did not answer "${command}" within ${commandTimeoutMs / 1000} seconds`);
    subprocess.stdin.write(`${command}\n`);
    return answered;
  }

  // Resolves with the event's value. Rejects when kap-recorder exits first or takes too long.
  private async waitFor(event: string, timeoutMs: number, timeoutMessage: string): Promise<string | undefined> {
    const timeout = AbortSignal.timeout(timeoutMs);

    try {
      const [value] = await Promise.race([
        once(this.events, event, {signal: timeout}),
        this.finished!.then(() => {
          throw new Error(`The recorder stopped before "${event}"`);
        }),
      ]) as [string | undefined];

      return value;
    } catch (error) {
      if (timeout.aborted) {
        throw timeoutError(timeoutMessage);
      }

      throw error;
    }
  }
}

export const getRecorderAudioDevices = async (): Promise<Array<{id: string; name: string}>> => {
  const {stdout} = await execa(getNativeBinaryPath('kap-recorder'), ['audio-devices']);
  return JSON.parse(stdout);
};
