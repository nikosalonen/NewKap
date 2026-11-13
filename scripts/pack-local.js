'use strict';

// Packages Kap signed with the self-signed "Kap Local Signing" certificate
// (scripts/create-local-signing-identity.sh). macOS ties Screen Recording and
// Microphone grants to the signature, so with the same certificate the grants
// carry over from build to build and from release to release.
//
//   node scripts/pack-local.js            test build in dist/mac-arm64; signs ad hoc
//                                         when the certificate is missing
//   node scripts/pack-local.js --release  release DMG in dist/; needs the certificate
//
// Hardened runtime stays off: without an Apple Team ID, its library validation
// stops Kap from loading Electron Framework. A notarized build needs a
// Developer ID certificate instead (`pnpm dist:developer-id`).

const {execFileSync} = require('node:child_process');
const process = require('node:process');

const localIdentity = 'Kap Local Signing';
const isRelease = process.argv.includes('--release');

const hasLocalIdentity = () => {
  try {
    const identities = execFileSync('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning'], {encoding: 'utf8'});
    return identities.includes(`"${localIdentity}"`);
  } catch {
    return false;
  }
};

const getIdentity = () => {
  if (hasLocalIdentity()) {
    console.log(`Signing with "${localIdentity}".`);
    return localIdentity;
  }

  if (isRelease) {
    // A release signed with another key would make every user grant the permissions again.
    console.error(`Release builds must be signed with "${localIdentity}", which is not in your keychain. Import the backed-up certificate (see maintaining.md).`);
    return undefined;
  }

  console.log('Signing ad hoc, so macOS asks for permissions again after this build. Run scripts/create-local-signing-identity.sh once to keep them.');
  return '-';
};

const identity = getIdentity();

if (identity) {
  try {
    execFileSync('electron-builder', [
      ...(isRelease ? [] : ['--dir']),
      `-c.mac.identity=${identity}`,
      '-c.mac.hardenedRuntime=false',
    ], {stdio: 'inherit'});
  } catch (error) {
    process.exitCode = error.status ?? 1;
  }
} else {
  process.exitCode = 1;
}
