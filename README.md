<p align="center">
  <img src="renderer/public/static/kap-icon.png" width="96" height="96" alt="Ture icon">
</p>

<h1 align="center">Ture</h1>

Ture is a lightweight macOS screen recorder and screenshot tool that lives in the menu bar, for Apple Silicon Macs. It started as a fork of [Kap](https://github.com/wulkano/Kap) and took its own name in version 6, when it moved to ScreenCaptureKit: Kap + Ture = Kapture, the name Kap gives every recording.

[![Latest release](https://img.shields.io/github/v/release/nikosalonen/NewKap?label=release)](https://github.com/nikosalonen/NewKap/releases)
[![CI](https://github.com/nikosalonen/NewKap/actions/workflows/ci.yml/badge.svg)](https://github.com/nikosalonen/NewKap/actions/workflows/ci.yml)
[![macOS](https://img.shields.io/badge/macOS-13%2B-blue)](#compatibility)
[![Apple Silicon arm64](https://img.shields.io/badge/Apple%20Silicon-arm64-informational)](#download)
[![License](https://img.shields.io/github/license/nikosalonen/NewKap)](LICENSE.md)

## Download

Download Ture from this fork's [GitHub Releases](https://github.com/nikosalonen/NewKap/releases). Its releases are for Apple Silicon Macs (M1 and newer) on macOS 26 or later, as `Ture-<version>-mac-arm64.dmg`. On macOS 13 to 15, use [Kap 5.2.3](https://github.com/nikosalonen/NewKap/releases/tag/v5.2.3).

For an Intel Mac, use Kap 5.1.0 from the [upstream NewKap releases](https://github.com/jacobpowaza/NewKap/releases/tag/v5.1.0), the last release with an Intel build. To check which Mac you have, open **Apple menu -> About This Mac**: Macs that show **Chip** are Apple Silicon.

Install:

1. Download the DMG, open it, and drag `Ture.app` into Applications.
2. Open Ture from Applications. macOS refuses to open it the first time, because releases are signed with this fork's own certificate instead of an Apple Developer ID and are not notarized. Close the message, open **System Settings -> Privacy & Security**, and click **Open Anyway** next to the message about Ture. macOS asks this once for each downloaded version.
3. Grant Screen Recording permission when macOS asks.
4. Grant Microphone permission only if you want audio capture.

## Updating

Ture checks this fork's latest GitHub Release and can open its DMG for you. Use **Check for Updates...** from the application menu or Preferences. The updater does not silently install updates; replace the app in Applications with the downloaded `Ture.app`, and confirm **Open Anyway** once more for the new version.

Every release is signed with the same certificate, so Screen Recording and Microphone permissions carry over to the new version.

## Features

Ture keeps Kap's capture and editing workflow and runs natively on Apple Silicon. [`docs/releases/`](docs/releases) lists the changes in each release.

- Menu-bar screen recording workflow with crop area selection, window/app selection, multi-display cropper windows, countdown, cursor options, click highlighting, and recording shortcuts.
- Screenshot mode from the capture overlay, including native macOS selection behavior and Command+C direct-to-clipboard capture.
- Timeline editor with click-to-seek playback, play/pause, five-second skip controls, Space-bar playback, splitting, trimming, deleting, copying, pasting, cutting, and duplicating.
- Freeze Frame support that inserts an adjustable still-image clip at the selected frame.
- Clip controls for speed, brightness, contrast, and saturation with edited video/GIF export.
- MP4, HEVC, AV1, GIF, APNG, and WebM export options.
- Persistent preferences for recording, audio, quality, frame rate, export format, save location, notifications, launch at login, countdown, cursor behavior, and keybinds.
- Plugins for sharing and editing, installed from npm in Preferences.
- No analytics or crash reporting.

## Previews

<table>
  <tr>
    <td width="50%">
      <img src="docs/previews/editor-preview.gif" alt="Kap v5.1 editor timeline preview">
    </td>
    <td width="50%">
      <img src="docs/previews/screenshot-edit-preview.gif" alt="Ture screenshot editing preview">
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <img src="docs/previews/upgraded-settings.gif" alt="Ture upgraded settings preview">
      <br>
      <em>Yes, this GIF was recorded on Kap v5.1.</em>
    </td>
  </tr>
</table>

## Usage Overview

Open Ture from the menu bar, choose a crop or target window, then use the Record/Camera control to capture video or a screenshot. Finished recordings open in the editor, where you can trim, split, add freeze frames, adjust clips, preview playback, and export. Screenshots can be saved, copied, or edited from the screenshot preview workflow.

For audio recording, grant Microphone permission and choose an input in Preferences. For system audio, install a loopback device and select it as the audio input.

## Compatibility

Ture 6 records with ScreenCaptureKit and needs an Apple Silicon Mac (`arm64`) with macOS 26 or later. Kap 5.2.3 is the last release for macOS 13 to 15. Upstream [Kap 5.1.0](https://github.com/jacobpowaza/NewKap/releases/tag/v5.1.0) is the last release for Intel Macs and macOS 12.

Known limitations:

- Ture is normally a menu-bar accessory app and intentionally stays out of the Dock while idle.
- macOS may omit accessory apps from the standard Force Quit Applications window. Use Activity Monitor or Ture's tray menu.
- System audio capture requires a loopback audio device.
- Releases are self-signed and not notarized, so each downloaded version needs **Open Anyway** once.

## Development

Requirements:

- macOS 26 or later, which the screen recorder targets.
- Node 24, the version Electron 45 runs. `.nvmrc` pins the exact version; `package.json` `engines` allows any 24.x.
- pnpm, at the version in `package.json` `packageManager`. Run `corepack enable` once to get it.
- Xcode or its command-line tools, with the macOS 26 SDK.
- An Apple Silicon Mac. `pnpm install` builds the native helper (`native/kap-helper.swift`) and the screen recorder (`native/recorder`, a Swift package) for arm64, and downloads the gifsicle binary into `native/build` (`scripts/fetch-gifsicle.js` checks its SHA-256).

Install and run:

```bash
git clone https://github.com/nikosalonen/NewKap.git
cd NewKap
nvm use
pnpm install --frozen-lockfile
unset ELECTRON_RUN_AS_NODE
pnpm start
```

Quality checks:

```bash
pnpm typecheck
pnpm lint
pnpm test:main
pnpm build-renderer
```

Packaging:

```bash
# Test build for this Mac: dist/mac-arm64/Ture.app.
pnpm run pack:local

# Release DMG in dist/, signed with the "Kap Local Signing" certificate.
# See maintaining.md for the release steps.
pnpm dist

# Signed with a Developer ID certificate and notarized, if you have one.
pnpm dist:developer-id
```

macOS ties Screen Recording and Microphone access to the app's signature. By default `pack:local` signs ad hoc, which gives every build a new signature, so each build needs the permissions again. Run `scripts/create-local-signing-identity.sh` once: it creates a self-signed "Kap Local Signing" certificate in your login keychain (macOS asks for your password to trust it), and `pack:local` then signs with it, so the permissions carry over between builds. Keep one copy of the test build, such as `/Applications/Ture.app`: copies with different signatures share one permission entry and take it from each other, and macOS's "Quit & Reopen" may start the other copy.

Packaging removes the Intel code from universal binaries and fails if any binary in the app has no arm64 code (`scripts/after-pack.js`).

`pnpm dist:developer-id` notarizes the app when these environment variables are set: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`, or `APPLE_API_KEY`, `APPLE_API_KEY_ID` and `APPLE_API_ISSUER`. The old `electron-builder-notarize` names `APPLE_ID_PASSWORD` and `APPLE_API_KEY_ISSUER` no longer work. Verify signing and notarization before publishing artifacts.

## Project Shape

- `main/` contains the Electron main process, recording, screenshot, conversion, updater, plugins, menus, and window managers.
- `renderer/` contains the Next.js/React windows for the cropper, preferences, editor, exports, dialogs, and screenshot preview.
- `static/` and `build/` contain packaged app assets.
- `test/` contains AVA tests and media fixtures.
- `docs/previews/` contains the README preview GIFs.

Static packaged builds load `renderer/out/*` through the `electron-next` file-protocol mapping. Keep that mapping intact when changing startup or cropper loading.

## Contributing

Use focused branches and keep unrelated changes out of release or bug-fix work.

```bash
git checkout -b fix/short-description
pnpm typecheck
pnpm lint
pnpm test:main
pnpm build-renderer
```

When changing cropper, tray, recording, screenshot, editor, conversion, or updater behavior, include the exact manual path you tested. For cropper changes, verify repeated open, close, reopen, Escape, mouseup outside the overlay, and multi-display behavior when hardware is available.

Bug reports should include:

- macOS version from `sw_vers`.
- Mac architecture from About This Mac.
- Ture version, and whether it is a release or your own build.
- Steps to reproduce.
- Relevant terminal output when running from `pnpm start`.

## Troubleshooting

### Screen recording does not start

Open **System Settings -> Privacy & Security -> Screen Recording** and turn on Ture. Choose **Quit & Reopen** when macOS offers it.

If Ture is already on but recording still fails, the entry may belong to a differently signed copy of Ture, such as another build or an older release. Select Ture in the list, remove it with the minus button, then open Ture and grant access again. Keep only one copy of Ture.app on the Mac.

### Microphone or audio input is missing

Open **System Settings -> Privacy & Security -> Microphone** and grant access to Ture. For system audio, install a loopback audio device and select it in Preferences.

### Ture does not open on an Intel Mac

Releases from this fork are for Apple Silicon only. Open **Apple menu -> About This Mac**: if it shows an Intel **Processor** instead of a **Chip**, use upstream [Kap 5.1.0](https://github.com/jacobpowaza/NewKap/releases/tag/v5.1.0), the last release with an Intel build.

### macOS warns about Gatekeeper

Releases from this fork are self-signed and not notarized, so macOS blocks the first launch of each downloaded version. Open **System Settings -> Privacy & Security** and click **Open Anyway** next to the message about Ture.

### Cropper opens but the overlay is invisible or blocks clicks

Run from the terminal with `pnpm start` and look for cropper logs. A healthy open shows renderer load followed by cropper readiness. Rebuild the renderer with `pnpm build-renderer` if static assets are stale.

### Development still shows an Electron icon

`scripts/run-electron.js` brands the local Electron development host with Ture metadata. If macOS caches an old icon, quit Ture, rebuild, and relaunch.

## License

Ture is released under the [MIT License](LICENSE.md).

## Credits

Ture builds on the original [Kap](https://github.com/wulkano/Kap) project and the work of Wulkano contributors, Kap maintainers, and plugin authors. This fork continues [MuntasirMalek/NewKap](https://github.com/MuntasirMalek/NewKap) and [jacobpowaza/NewKap](https://github.com/jacobpowaza/NewKap), and focuses on keeping Ture usable on modern macOS while preserving the lightweight workflow that made Ture useful.
