'use strict';

// Packages a launchable test build in dist/mac-arm64 without a Developer ID.
// It signs with the "Kap Local Signing" certificate when the keychain has it
// (scripts/create-local-signing-identity.sh), so macOS keeps Kap's Screen
// Recording and Microphone grants from build to build. Otherwise it signs ad
// hoc, and every build needs the grants again.
// Hardened runtime stays off: without an Apple Team ID, its library validation
// stops Kap from loading Electron Framework.

const {execFileSync} = require('node:child_process');
const process = require('node:process');

const localIdentity = 'Kap Local Signing';

const hasLocalIdentity = () => {
  try {
    const identities = execFileSync('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning'], {encoding: 'utf8'});
    return identities.includes(`"${localIdentity}"`);
  } catch {
    return false;
  }
};

const identity = hasLocalIdentity() ? localIdentity : '-';

if (identity === '-') {
  console.log('Signing ad hoc, so macOS asks for permissions again after this build. Run scripts/create-local-signing-identity.sh once to keep them.');
} else {
  console.log(`Signing with "${identity}".`);
}

try {
  execFileSync('electron-builder', ['--dir', `-c.mac.identity=${identity}`, '-c.mac.hardenedRuntime=false'], {stdio: 'inherit'});
} catch (error) {
  process.exitCode = error.status ?? 1;
}
