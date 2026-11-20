#!/usr/bin/env node
'use strict';

// Stands in for native/recorder in tests (test/mocks/native-binary.ts). It speaks
// kap-recorder's stdin/stdout protocol without recording, and writes the options
// it got into the destination file so tests can check them.
// FAKE_KAP_RECORDER=fail makes it fail before the recording starts.

const fs = require('node:fs');
const process = require('node:process');
const readline = require('node:readline');

const [command, optionsJson] = process.argv.slice(2);

if (command === 'audio-devices') {
  console.log(JSON.stringify([{id: 'BuiltInMicrophoneDevice', name: 'MacBook Pro Microphone'}]));
  process.exit(0);
}

if (process.env.FAKE_KAP_RECORDER === 'fail') {
  console.error('Could not start the recording: Missing screen capture permissions.');
  process.exit(1);
}

const options = JSON.parse(optionsJson);
fs.writeFileSync(new URL(options.destination), optionsJson);

let isPaused = false;

readline.createInterface({input: process.stdin}).on('line', line => {
  switch (line) {
    case 'pause': {
      isPaused = true;
      console.log('onPause');
      break;
    }

    case 'resume': {
      isPaused = false;
      console.log('onResume');
      break;
    }

    case 'isPaused': {
      console.log(`isPaused ${isPaused}`);
      break;
    }

    default: {
      console.error(`Unknown command: ${line}`);
    }
  }
});

process.on('SIGTERM', () => {
  process.exit(0);
});

console.log('onStart');
