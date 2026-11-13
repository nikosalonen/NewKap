import path from 'node:path';

const packedDirectory = `${path.sep}app.asar${path.sep}`;
const unpackedDirectory = `${path.sep}app.asar.unpacked${path.sep}`;

// A packaged app can't run binaries from inside app.asar. electron-builder unpacks them
// into app.asar.unpacked, so point the path there. Other paths are returned unchanged.
export const fixPathForAsarUnpack = (filePath: string) => filePath.replace(packedDirectory, () => unpackedDirectory);
