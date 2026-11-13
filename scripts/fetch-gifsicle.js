'use strict';

// Downloads the gifsicle binary that Kap runs to shrink GIFs into native/build,
// and checks it against a pinned SHA-256. These are the same Gifsicle 1.93
// binaries the gifsicle npm package (gifsicle-bin 7.0.1) used to download.
// Fetching them here keeps that package's downloader and its old dependencies
// out of the app. Gifsicle is GPL-2.0 licensed: https://www.lcdf.org/gifsicle/

const {Buffer} = require('node:buffer');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

// The commit that gifsicle-bin's v7.0.1 tag points to.
const baseUrl = 'https://raw.githubusercontent.com/imagemin/gifsicle-bin/55087486e1425fd8e99597cff3b2e1d019d8a797/vendor';

const binaries = {
  // Universal binary; packaging strips the Intel code (scripts/after-pack.js).
  'darwin-arm64': {
    url: `${baseUrl}/macos/gifsicle`,
    sha256: '02a2420e186ac8b58c2f19de52d771f188e132a6babf3ef22c518b36f96f4f50',
  },
  // Only for the tests on Linux CI. Kap itself runs on macOS only.
  'linux-x64': {
    url: `${baseUrl}/linux/x64/gifsicle`,
    sha256: 'f0b4609e4137bbda1b05ec1dc334467fa3de840b0d26cf3114d03754f16fa264',
  },
};

const outputPath = path.join(__dirname, '..', 'native', 'build', 'gifsicle');

const getSha256 = data => createHash('sha256').update(data).digest('hex');

const fetchGifsicle = async () => {
  const platform = `${process.platform}-${process.arch}`;
  const binary = binaries[platform];

  if (!binary) {
    throw new Error(`There is no gifsicle binary for ${platform}.`);
  }

  if (fs.existsSync(outputPath) && getSha256(fs.readFileSync(outputPath)) === binary.sha256) {
    return;
  }

  const response = await fetch(binary.url);

  if (!response.ok) {
    throw new Error(`Downloading gifsicle failed with HTTP ${response.status}: ${binary.url}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  const sha256 = getSha256(data);

  if (sha256 !== binary.sha256) {
    throw new Error(`The downloaded gifsicle has SHA-256 ${sha256}, expected ${binary.sha256}: ${binary.url}`);
  }

  const temporaryPath = `${outputPath}.download`;
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(temporaryPath, data);
  fs.chmodSync(temporaryPath, 0o755);
  fs.renameSync(temporaryPath, outputPath);
  console.log(`Downloaded gifsicle to ${path.relative(process.cwd(), outputPath)}`);
};

fetchGifsicle().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
