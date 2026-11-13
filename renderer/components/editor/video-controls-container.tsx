import {createContainer} from 'unstated-next';
import {useRef, useState, useEffect} from 'react';

const useVideoControls = () => {
  const videoRef = useRef<HTMLVideoElement>();
  const wasPausedRef = useRef(true);
  const transitioningPauseStateRef = useRef<Promise<void>>();

  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  const play = async () => {
    if (videoRef.current?.paused) {
      transitioningPauseStateRef.current = videoRef.current.play();
      try {
        await transitioningPauseStateRef.current;
        setIsPaused(false);
      } catch {}
    } else if (videoRef.current) {
      setIsPaused(false);
    }
  };

  const pause = async () => {
    if (!videoRef.current) {
      return;
    }

    if (videoRef.current.paused) {
      setIsPaused(true);
      return;
    }

    if (!videoRef.current.paused) {
      try {
        await transitioningPauseStateRef.current;
      } catch {} finally {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const holdFrame = () => {
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  };

  const resumeAfterHold = async () => {
    if (videoRef.current?.paused) {
      try {
        await videoRef.current.play();
      } catch {}
    }

    setIsPaused(false);
  };

  const mute = () => {
    setIsMuted(true);
    videoRef.current.muted = true;
  };

  const unmute = () => {
    setIsMuted(false);
    videoRef.current.muted = false;
  };

  const setVideoRef = (video: HTMLVideoElement) => {
    videoRef.current = video;
    setIsPaused(video.paused);

    if (video.paused) {
      play();
    }
  };

  const videoProps = {
    onCanPlayThrough: hasStarted
      ? undefined
      : () => {
        setHasStarted(true);
        if (document.hasFocus()) {
          play();
        }
      },
    onLoadedData() {
      const hasAudio = (videoRef.current as any).webkitAudioDecodedByteCount > 0 || (videoRef.current as any).audioTracks?.length > 0;

      if (!hasAudio) {
        mute();
      }
    },
    onEnded() {
      setIsPaused(true);
    },
  };

  useEffect(() => {
    const blurListener = () => {
      wasPausedRef.current = videoRef.current?.paused;
      if (!wasPausedRef.current) {
        pause();
      }
    };

    const focusListener = () => {
      if (!wasPausedRef.current) {
        play();
      }
    };

    window.addEventListener('blur', blurListener);
    window.addEventListener('focus', focusListener);

    return () => {
      window.removeEventListener('blur', blurListener);
      window.removeEventListener('focus', focusListener);
    };
  }, []);

  return {
    isPaused,
    isMuted,
    setVideoRef,
    pause,
    play,
    holdFrame,
    resumeAfterHold,
    mute,
    unmute,
    videoProps,
  };
};

const VideoControlsContainer = createContainer(useVideoControls);

export default VideoControlsContainer;
