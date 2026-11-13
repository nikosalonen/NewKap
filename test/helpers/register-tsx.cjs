// Loads tsx for the tests, but lets Node load JavaScript from node_modules itself.
//
// tsx turns every ES module it meets into CommonJS, including dependencies. That breaks
// ESM-only packages such as execa, whose own dependencies can only be imported. Node 24
// can require() ES modules natively, so dependency files skip tsx; our TypeScript and
// the test files still go through it.
const path = require('node:path');
const Module = require('node:module');

const nodeLoadJs = Module._extensions['.js'];
require('tsx/cjs');

const tsxLoadJs = Module._extensions['.js'];

const dependencyDirectory = `${path.sep}node_modules${path.sep}`;

Module._extensions['.js'] = function (module, filename) {
  const load = filename.includes(dependencyDirectory) ? nodeLoadJs : tsxLoadJs;
  return load.call(this, module, filename);
};
