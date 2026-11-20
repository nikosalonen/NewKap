import process from 'node:process';
import {app, dialog, shell} from 'electron';
import got from 'got';
import semver from 'semver';
import {getDisplayedMacosVersion, isMacosVersionAtLeast} from './utils/system-version';

const REPO_OWNER = 'nikosalonen';
const REPO_NAME = 'NewKap';
const RELEASES_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type GithubRelease = {
  tag_name: string;
  name?: string;
  html_url?: string;
  // eslint-disable-next-line @typescript-eslint/no-restricted-types -- GitHub sends null when a release has no notes.
  body?: string | null;
  assets?: GithubReleaseAsset[];
};

// A release that needs a newer macOS than the one before it says so in its notes
// with a line that GitHub doesn't show, for example <!-- kap-minimum-macos: 26.0 -->.
// See maintaining.md.
const minimumMacosMarker = /<!--\s*kap-minimum-macos:\s*(\d+(?:\.\d+)*)\s*-->/i;

let isChecking = false;

export const normalizeReleaseVersion = (version: string | undefined) => version ? semver.valid(version) ?? semver.valid(version.replace(/^v/i, '')) ?? undefined : undefined;

export const isReleaseNewer = (releaseVersion: string | undefined, currentVersion: string) => {
  const normalizedRelease = normalizeReleaseVersion(releaseVersion);
  const normalizedCurrent = normalizeReleaseVersion(currentVersion);

  return !normalizedRelease || !normalizedCurrent ? false : semver.gt(normalizedRelease, normalizedCurrent);
};

export const getReleaseDownloadUrl = (release: GithubRelease, arch = process.arch) => {
  const assetArch = arch === 'arm64' ? 'arm64' : 'x64';
  const matchingAsset = release.assets?.find(asset => {
    const name = asset.name.toLowerCase();
    return name.endsWith('.dmg') && name.includes(`mac-${assetArch}`);
  });

  return matchingAsset?.browser_download_url;
};

export const getReleaseMinimumMacosVersion = (release: GithubRelease) => minimumMacosMarker.exec(release.body ?? '')?.[1];

// Returns undefined while the repository has no release: GitHub then answers
// 404 for releases/latest.
const fetchLatestRelease = async (): Promise<GithubRelease | undefined> => {
  try {
    const response = await got<GithubRelease>(LATEST_RELEASE_API_URL, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': `Ture/${app.getVersion()}`,
      },
      responseType: 'json',
      timeout: 10_000,
    });

    return response.body;
  } catch (error) {
    if ((error as {response?: {statusCode?: number}}).response?.statusCode === 404) {
      return undefined;
    }

    throw error;
  }
};

const showUpdateAvailableDialog = async (release: GithubRelease) => {
  const releaseVersion = normalizeReleaseVersion(release.tag_name) ?? release.tag_name;
  const releaseUrl = release.html_url ?? RELEASES_URL;
  const downloadUrl = getReleaseDownloadUrl(release);

  const {response} = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Not Now', 'Update', 'Open Release Page'],
    defaultId: 1,
    cancelId: 0,
    message: 'Update Available',
    detail: `Ture ${releaseVersion} is available. You have ${app.getVersion()}.`,
  });

  if (response === 1) {
    await shell.openExternal(downloadUrl ?? releaseUrl);
  } else if (response === 2) {
    await shell.openExternal(releaseUrl);
  }
};

const showNeedsNewerMacosDialog = async (release: GithubRelease, minimumMacosVersion: string) => {
  const releaseVersion = normalizeReleaseVersion(release.tag_name) ?? release.tag_name;

  await dialog.showMessageBox({
    type: 'info',
    message: 'Update Needs a Newer macOS',
    detail: `Ture ${releaseVersion} needs macOS ${minimumMacosVersion} or later. This Mac has macOS ${getDisplayedMacosVersion()}, so keep using Ture ${app.getVersion()}.`,
  });
};

export const checkForUpdates = async ({silent = true}: {silent?: boolean} = {}) => {
  if (isChecking) {
    return;
  }

  isChecking = true;

  try {
    const release = await fetchLatestRelease();
    if (release && isReleaseNewer(release.tag_name, app.getVersion())) {
      const minimumMacosVersion = getReleaseMinimumMacosVersion(release);
      if (minimumMacosVersion && !isMacosVersionAtLeast(minimumMacosVersion)) {
        // The hourly check stays quiet: the answer only changes when macOS does.
        if (!silent) {
          await showNeedsNewerMacosDialog(release, minimumMacosVersion);
        }

        return;
      }

      await showUpdateAvailableDialog(release);
      return;
    }

    if (!silent) {
      await dialog.showMessageBox({
        type: 'info',
        message: 'You’re up to date',
        detail: `Ture ${app.getVersion()} is the latest version.`,
      });
    }
  } catch (error) {
    console.error('[updater] update check failed', error);

    if (!silent) {
      await dialog.showMessageBox({
        type: 'error',
        message: 'Update Check Failed',
        detail: (error as Error).message,
      });
    }
  } finally {
    isChecking = false;
  }
};
