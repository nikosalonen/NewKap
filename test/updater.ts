import test from 'ava';
import {
  getReleaseDownloadUrl,
  getReleaseMinimumMacosVersion,
  isReleaseNewer,
  normalizeReleaseVersion,
} from '../main/updater';

test('normalizeReleaseVersion accepts v-prefixed GitHub tags', t => {
  t.is(normalizeReleaseVersion('v5.1.0'), '5.1.0');
  t.is(normalizeReleaseVersion('5.1.0'), '5.1.0');
  t.is(normalizeReleaseVersion('release-5'), undefined);
});

test('isReleaseNewer compares normalized release tags', t => {
  t.true(isReleaseNewer('v5.1.0', '5.0.0'));
  t.false(isReleaseNewer('v5.0.0', '5.0.0'));
  t.false(isReleaseNewer('v4.9.0', '5.0.0'));
  t.false(isReleaseNewer('release-5', '5.0.0'));
});

test('getReleaseDownloadUrl chooses the matching mac dmg for the current architecture', t => {
  /* eslint-disable @typescript-eslint/naming-convention -- GitHub API field names */
  const release = {
    tag_name: 'v5.1.0',
    assets: [
      {
        name: 'Kap-5.1.0-mac-x64.dmg',
        browser_download_url: 'https://example.com/x64.dmg',
      },
      {
        name: 'Kap-5.1.0-mac-arm64.dmg',
        browser_download_url: 'https://example.com/arm64.dmg',
      },
    ],
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  t.is(getReleaseDownloadUrl(release, 'arm64'), 'https://example.com/arm64.dmg');
  t.is(getReleaseDownloadUrl(release, 'x64'), 'https://example.com/x64.dmg');
});

test('getReleaseMinimumMacosVersion reads the marker in the release notes', t => {
  /* eslint-disable @typescript-eslint/naming-convention -- GitHub API field names */
  const withMarker = {tag_name: 'v6.0.0', body: '# Kap v6.0.0\r\n\r\n<!-- kap-minimum-macos: 26.0 -->\r\n\r\nNotes'};
  const withSpacing = {tag_name: 'v6.0.0', body: '<!--kap-minimum-macos:26-->'};
  const withoutMarker = {tag_name: 'v5.2.2', body: '- macOS 13 Ventura or later.'};
  const withoutBody = {tag_name: 'v5.2.2', body: null};
  /* eslint-enable @typescript-eslint/naming-convention */

  t.is(getReleaseMinimumMacosVersion(withMarker), '26.0');
  t.is(getReleaseMinimumMacosVersion(withSpacing), '26');
  t.is(getReleaseMinimumMacosVersion(withoutMarker), undefined);
  t.is(getReleaseMinimumMacosVersion(withoutBody), undefined);
});
