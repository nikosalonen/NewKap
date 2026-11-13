import {protocol} from 'electron';

export const setupProtocol = () => {
  // Fix protocol issue in order to support loading editor previews
  // https://github.com/electron/electron/issues/23757#issuecomment-640146333
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- protocol.handle() needs its own change and a test of editor previews
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''));
    callback(pathname);
  });
};
