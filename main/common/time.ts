// Time helpers shared by the main process and the renderer.

export const padNumber = (value: number) => String(value).padStart(2, '0');

// Seconds as m:ss, or hh:mm:ss from one hour up, with optional hundredths of a second.
const formatDuration = (seconds: number, showMilliseconds = false) => {
  const totalMilliseconds = Math.trunc(seconds * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor(totalMilliseconds / 60_000) % 60;
  const wholeSeconds = Math.floor(totalMilliseconds / 1000) % 60;
  const hundredths = Math.floor((totalMilliseconds % 1000) / 10);

  const clock = seconds >= 3600 ?
    `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(wholeSeconds)}` :
    `${minutes}:${padNumber(wholeSeconds)}`;

  return showMilliseconds ? `${clock}.${padNumber(hundredths)}` : clock;
};

export const formatTime = (time: number, {showMilliseconds = false, extra}: {showMilliseconds?: boolean; extra?: number} = {}) => {
  const extraFormatted = extra ? `  (${formatDuration(extra, showMilliseconds)})` : '';
  return `${formatDuration(time, showMilliseconds)}${extraFormatted}`;
};

// Parses an ffmpeg timestamp such as "01:02:03.45". Returns 0 for anything else.
export const timestampToMilliseconds = (timestamp = '') => {
  const match = /^(\d+):(\d\d):(\d\d(?:\.\d+)?)$/.exec(timestamp);

  if (!match) {
    return 0;
  }

  const [, hours, minutes, seconds] = match;
  return Math.round(((((Number(hours) * 60) + Number(minutes)) * 60) + Number(seconds)) * 1000);
};
