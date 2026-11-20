import process from 'node:process';

type SignalListener = (signal: NodeJS.Signals) => void;

/**
Makes `listener` the first listener for `signal`, and makes the JavaScript listeners for `signal` run at all.

While it starts, Electron installs its own SIGTERM and SIGINT handlers over the one Node installed for `process.on()`. Electron's handler quits the app like ⌘Q, and JavaScript listeners never run. Removing every listener stops Node's handler; adding them back installs it again, this time over Electron's. Call this once the app is ready.
*/
export const listenToSignalFirst = (signal: NodeJS.Signals, listener: SignalListener) => {
  // Raw listeners keep the wrappers of `once` listeners, so those still run only once.
  const otherListeners = process.rawListeners(signal) as SignalListener[];
  process.removeAllListeners(signal);
  process.on(signal, listener);

  for (const otherListener of otherListeners) {
    process.on(signal, otherListener);
  }
};
