import {padNumber} from '../common/time';

export const generateTimestampedName = (title = 'Kapture', extension = '') => {
  const now = new Date();
  const date = `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())}`;
  const time = `${padNumber(now.getHours())}.${padNumber(now.getMinutes())}.${padNumber(now.getSeconds())}`;

  return `${title} ${date} at ${time}${extension}`;
};
