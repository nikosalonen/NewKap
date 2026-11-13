import process from 'node:process';
import ava from 'ava';
import {isMacosVersion, isMacosVersionAtLeast} from '../main/utils/system-version';

const test = ava.serial;

// Electron adds process.getSystemVersion(); plain Node does not have it.
const givenMacosVersion = (version: string) => {
  (process as any).getSystemVersion = () => version;
};

test('plugin macOS ranges are checked against the running macOS version', t => {
  givenMacosVersion('14.4.1');

  t.true(isMacosVersion('*'));
  t.true(isMacosVersion('>=14'));
  t.false(isMacosVersion('<14'));
});

test('minimum version checks accept short versions', t => {
  givenMacosVersion('26.1');

  t.true(isMacosVersionAtLeast('13'));
  t.true(isMacosVersionAtLeast('26.1'));
  t.false(isMacosVersionAtLeast('27.0'));
});
