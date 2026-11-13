import test from 'ava';
import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';
import tempy from 'tempy';

const {keepOnlyArm64} = require('../scripts/arm64-only');

const compile = (outputPath: string, archs: string[]) => {
  const source = path.join(path.dirname(outputPath), 'main.c');
  fs.writeFileSync(source, 'int main(void) { return 0; }\n');
  execFileSync('/usr/bin/clang', [...archs.flatMap(arch => ['-arch', arch]), source, '-o', outputPath]);
  fs.rmSync(source);
};

const archsOf = (file: string) => execFileSync('/usr/bin/lipo', ['-archs', file]).toString().trim();

const givenApp = () => {
  const appDir = tempy.directory();
  const helpersDir = path.join(appDir, 'Contents', 'Resources', 'helpers');
  fs.mkdirSync(helpersDir, {recursive: true});

  const universal = path.join(helpersDir, 'universal');
  const intelOnly = path.join(helpersDir, 'intel-only');
  const arm64Only = path.join(helpersDir, 'arm64-only');
  const textFile = path.join(helpersDir, 'notes.txt');

  compile(universal, ['arm64', 'x86_64']);
  compile(intelOnly, ['x86_64']);
  compile(arm64Only, ['arm64']);
  fs.writeFileSync(textFile, 'not a binary');

  return {appDir, universal, intelOnly, arm64Only, textFile};
};

test('strips the Intel code from universal binaries', t => {
  const {appDir, universal} = givenApp();

  const {thinned} = keepOnlyArm64(appDir);

  t.is(archsOf(universal), 'arm64');
  t.deepEqual(thinned, [universal]);
});

test('reports binaries that have no arm64 code', t => {
  const {appDir, intelOnly} = givenApp();

  const {missingArm64} = keepOnlyArm64(appDir);

  t.deepEqual(missingArm64, [intelOnly]);
});

test('leaves arm64 binaries and other files alone', t => {
  const {appDir, arm64Only, textFile} = givenApp();
  const arm64Before = fs.readFileSync(arm64Only);

  const {thinned} = keepOnlyArm64(appDir);

  t.false(thinned.includes(arm64Only));
  t.true(fs.readFileSync(arm64Only).equals(arm64Before));
  t.is(fs.readFileSync(textFile, 'utf8'), 'not a binary');
});
