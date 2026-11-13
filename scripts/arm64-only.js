'use strict';

const {Buffer} = require('node:buffer');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// First four bytes of Mach-O files: 64-bit and 32-bit binaries in either byte order, and universal (fat) binaries.
const machOMagicNumbers = new Set([
  0xFE_ED_FA_CF,
  0xCF_FA_ED_FE,
  0xFE_ED_FA_CE,
  0xCE_FA_ED_FE,
  0xCA_FE_BA_BE,
  0xBE_BA_FE_CA,
  0xCA_FE_BA_BF,
  0xBF_BA_FE_CA,
]);

const isMachO = file => {
  const fileDescriptor = fs.openSync(file, 'r');
  try {
    const header = Buffer.alloc(4);
    return fs.readSync(fileDescriptor, header, 0, 4, 0) === 4 && machOMagicNumbers.has(header.readUInt32BE(0));
  } finally {
    fs.closeSync(fileDescriptor);
  }
};

// Skips symbolic links, so framework aliases such as Versions/Current are not visited twice.
const listFiles = directory => fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
  const fullPath = path.join(directory, entry.name);

  if (entry.isDirectory()) {
    return listFiles(fullPath);
  }

  return entry.isFile() ? [fullPath] : [];
});

const getArchitectures = file => {
  try {
    return execFileSync('/usr/bin/lipo', ['-archs', file], {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim().split(/\s+/);
  } catch {
    // Not a binary lipo understands, such as a Java class file with the same first bytes.
    return undefined;
  }
};

const thinToArm64 = file => {
  const thinFile = `${file}.arm64`;
  execFileSync('/usr/bin/lipo', [file, '-thin', 'arm64', '-output', thinFile]);
  fs.chmodSync(thinFile, fs.statSync(file).mode);
  fs.renameSync(thinFile, file);
};

// Keeps only the arm64 code in every binary under appDirectory.
// Returns the binaries it changed and the binaries that have no arm64 code at all.
const keepOnlyArm64 = appDirectory => {
  const thinned = [];
  const missingArm64 = [];

  for (const file of listFiles(appDirectory)) {
    if (!isMachO(file)) {
      continue;
    }

    const architectures = getArchitectures(file);

    if (!architectures) {
      continue;
    }

    if (architectures.every(architecture => !architecture.startsWith('arm64'))) {
      missingArm64.push(file);
      continue;
    }

    if (!(architectures.includes('arm64') && architectures.length > 1)) {
      continue;
    }

    thinToArm64(file);
    thinned.push(file);
  }

  return {thinned, missingArm64};
};

module.exports = {keepOnlyArm64};
