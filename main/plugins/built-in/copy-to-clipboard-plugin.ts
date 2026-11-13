import {ShareServiceContext} from '../service-context';
import {copyFilesToClipboard} from '../../utils/clipboard';

const action = async (context: ShareServiceContext) => {
  const filePath = await context.filePath();
  await copyFilesToClipboard([filePath]);
  context.notify(`The ${context.prettyFormat} has been copied to the clipboard`);
};

const copyToClipboard = {
  title: 'Copy to Clipboard',
  formats: [
    'gif',
    'apng',
    'mp4'
  ],
  action
};

export const shareServices = [copyToClipboard];
