import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'ava';

type ModuleInternals = Module & {
  _compile: (source: string, filename: string) => void;
};

type ExecaError = Error & {code?: string; command?: string};

// Loads the installed (patched) aperture as if it were packaged at fakeDirectory.
const loadApertureFrom = (fakeDirectory: string) => {
  const realFile = require.resolve('aperture');
  const fakeFile = path.join(fakeDirectory, 'index.js');
  const module = new Module(fakeFile) as ModuleInternals;
  module.filename = fakeFile;
  // Aperture's own dependencies still resolve from where it is installed.
  module.paths = (Module as unknown as {_nodeModulePaths: (directory: string) => string[]})._nodeModulePaths(path.dirname(realFile));
  module._compile(fs.readFileSync(realFile, 'utf8'), fakeFile);
  return module.exports as {screens: () => Promise<unknown>};
};

// Electron can't run binaries inside app.asar. Aperture used electron-util,
// which checks process.mainModule, and Node 24 replaces that when an ES module
// loaded with require() imports CommonJS (electron-store 12 does). Recording
// then failed with spawn ENOTDIR (patches/aperture@6.1.2.patch).
test('aperture runs its binary from app.asar.unpacked in a packaged app', async t => {
  const resources = '/nonexistent/Kap.app/Contents/Resources';
  const aperture = loadApertureFrom(`${resources}/app.asar/node_modules/aperture`);

  const error = await t.throwsAsync<ExecaError>(aperture.screens());

  t.is(error?.code, 'ENOENT');
  t.true(error?.command?.startsWith(`${resources}/app.asar.unpacked/node_modules/aperture/aperture `), error?.command);
});

test('aperture runs its binary in place outside app.asar', async t => {
  const directory = '/nonexistent/NewKap/node_modules/aperture';
  const aperture = loadApertureFrom(directory);

  const error = await t.throwsAsync<ExecaError>(aperture.screens());

  t.true(error?.command?.startsWith(`${directory}/aperture `), error?.command);
});
