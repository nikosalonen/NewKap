import process from 'node:process';
import {app, dialog, shell} from 'electron';
import got from 'got';
import semver from 'semver';

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
  assets?: GithubReleaseAsset[];
};

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

// Returns undefined while the repository has no release: GitHub then answers
// 404 for releases/latest.
const fetchLatestRelease = async (): Promise<GithubRelease | undefined> => {
  try {
    const response = await got<GithubRelease>(LATEST_RELEASE_API_URL, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': `Kap/${app.getVersion()}`,
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
    detail: `Kap ${releaseVersion} is available. You have ${app.getVersion()}.`,
  });

  if (response === 1) {
    await shell.openExternal(downloadUrl ?? releaseUrl);
  } else if (response === 2) {
    await shell.openExternal(releaseUrl);
  }
};

export const checkForUpdates = async ({silent = true}: {silent?: boolean} = {}) => {
  if (isChecking) {
    return;
  }

  isChecking = true;

  try {
    const release = await fetchLatestRelease();
    if (release && isReleaseNewer(release.tag_name, app.getVersion())) {
      await showUpdateAvailableDialog(release);
      return;
    }

    if (!silent) {
      await dialog.showMessageBox({
        type: 'info',
        message: 'You’re up to date',
        detail: `Kap ${app.getVersion()} is the latest version.`,
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
