// Opens the microphone and reports its average level until stop() is called.
// stop() also releases the microphone when it runs before the stream has opened.
export const startAudioLevelMeter = ({deviceId, onLevel, onError}) => {
  let isStopped = false;
  let stream;
  let audioContext;
  let processor;

  const stop = () => {
    isStopped = true;

    if (processor) {
      processor.onaudioprocess = null;
      processor.disconnect();
    }

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
  };

  const connect = mediaStream => {
    stream = mediaStream;

    if (isStopped) {
      stop();
      return;
    }

    audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;

    processor = audioContext.createScriptProcessor(2048, 1, 1);
    audioContext.createMediaStreamSource(stream).connect(analyser);
    analyser.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = () => {
      const levels = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(levels);

      let total = 0;
      for (const level of levels) {
        total += level;
      }

      onLevel(total / levels.length);
    };
  };

  const open = async () => {
    try {
      connect(await navigator.mediaDevices.getUserMedia({audio: {deviceId}}));
    } catch (error) {
      onError(error);
    }
  };

  open();

  return {stop};
};
