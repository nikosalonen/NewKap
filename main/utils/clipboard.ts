import {pathToFileURL} from 'url';
import {clipboard, ClipboardItem, NativeImage} from 'electron';

// Since Electron 45 the clipboard follows the W3C Clipboard API: writes are asynchronous ClipboardItems.

export const copyImageToClipboard = async (image: NativeImage) => clipboard.write([
  new ClipboardItem({'image/png': new Blob([new Uint8Array(image.toPNG())], {type: 'image/png'})})
]);

// On macOS, text/uri-list becomes real file references, so Finder and other apps paste the files themselves.
export const copyFilesToClipboard = async (filePaths: string[]) => clipboard.write([
  new ClipboardItem({'text/uri-list': filePaths.map(filePath => pathToFileURL(filePath).href).join('\r\n')})
]);
