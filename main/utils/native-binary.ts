import process from 'node:process';
import path from 'node:path';
import {app} from 'electron';

// Binaries in native/build: kap-helper and kap-recorder (built by `pnpm build-native`) and
// gifsicle (downloaded by `pnpm fetch-gifsicle`). Packaged builds ship them in
// Contents/Resources (see "extraResources" in package.json).
export const getNativeBinaryPath = (name: string) => app.isPackaged
  ? path.join(process.resourcesPath, name)
  : path.join(__dirname, '..', '..', 'native', 'build', name);
