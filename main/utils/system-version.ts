import semver from 'semver';

// Electron adds process.getSystemVersion(), which reports the macOS version, for example "14.4.1" or "26.1".
const electronProcess = process as NodeJS.Process & {getSystemVersion: () => string};

const getMacosVersion = () => semver.coerce(electronProcess.getSystemVersion())?.version ?? '0.0.0';

export const isMacosVersion = (range: string) => semver.satisfies(getMacosVersion(), range);

export const isMacosVersionAtLeast = (version: string) => semver.gte(getMacosVersion(), semver.coerce(version)?.version ?? '0.0.0');
