import process from 'node:process';
import test from 'ava';
import {listenToSignalFirst} from '../main/utils/signals';

// SIGUSR2 stands in for SIGTERM, so the test process keeps its own handlers.
test('the new listener runs first and the others keep working, once listeners only once', t => {
  const calls: string[] = [];
  process.once('SIGUSR2', () => {
    calls.push('once');
  });
  process.on('SIGUSR2', () => {
    calls.push('always');
  });

  listenToSignalFirst('SIGUSR2', () => {
    calls.push('kap');
  });

  process.emit('SIGUSR2', 'SIGUSR2');
  process.emit('SIGUSR2', 'SIGUSR2');

  t.deepEqual(calls, ['kap', 'once', 'always', 'kap', 'always']);
  process.removeAllListeners('SIGUSR2');
});
