import path from 'node:path';

// Runs test/helpers/fake-kap-recorder.cjs in place of the real kap-recorder.
export const getNativeBinaryPath = (name: string) => path.join(__dirname, '..', 'helpers', `fake-${name}.cjs`);
