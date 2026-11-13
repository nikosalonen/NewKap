'use strict';

const path = require('path');
const {Arch} = require('builder-util');
const patchPackagedMetadata = require('./patch-packaged-metadata');
const {keepOnlyArm64} = require('./arm64-only');

// Runs after electron-builder copies the app and before it signs it.
module.exports = async context => {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  if (context.arch !== Arch.arm64) {
    throw new Error(`Kap builds for Apple Silicon (arm64) only, not ${Arch[context.arch]}.`);
  }

  await patchPackagedMetadata(context);

  const appName = context.packager.appInfo.productFilename || 'Kap';
  const {thinned, missingArm64} = keepOnlyArm64(path.join(context.appOutDir, `${appName}.app`));
  console.log(`[packaging] removed Intel code from ${thinned.length} universal binaries`);

  if (missingArm64.length > 0) {
    throw new Error(`These binaries have no arm64 code and need Rosetta to run:\n${missingArm64.join('\n')}`);
  }
};
