import fs from 'fs';
import path from 'path';
import {createHash} from 'crypto';
import {systemPreferences, shell, dialog, app, desktopCapturer} from 'electron';

let isDialogShowing = false;

const getSystemSettingsUrl = (privacySection: string) => `x-apple.systempreferences:com.apple.preference.security?${privacySection}`;

export const openSystemPreferences = async (privacySection: string) => shell.openExternal(getSystemSettingsUrl(privacySection));

const promptSystemPreferences = (options: {message: string; detail: string; systemPreferencesPath: string; quitAfterOpening: boolean}) => async ({hasAsked}: {hasAsked?: boolean} = {}) => {
  if (hasAsked || isDialogShowing) {
    return false;
  }

  isDialogShowing = true;
  app.focus({steal: true});
  try {
    const {response} = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Open System Settings', 'Cancel'],
      defaultId: 0,
      message: options.message,
      detail: options.detail,
      cancelId: 1
    });
    if (response === 0) {
      await openSystemPreferences(options.systemPreferencesPath);

      if (options.quitAfterOpening) {
        app.quit();
      }
    }
  } finally {
    isDialogShowing = false;
  }

  return false;
};

// Microphone

const getMicrophoneAccess = () => systemPreferences.getMediaAccessStatus('microphone');

// A microphone grant applies right away, so Kap keeps running.
const microphoneFallback = promptSystemPreferences({
  message: 'Kap cannot access the microphone.',
  detail: 'Kap requires microphone access to record audio. You can grant this in System Settings → Privacy & Security → Microphone. If the setting is locked, Screen Time or your organization manages it.',
  systemPreferencesPath: 'Privacy_Microphone',
  quitAfterOpening: false
});

export const ensureMicrophonePermissions = async (fallback = microphoneFallback) => {
  const access = getMicrophoneAccess();

  if (access === 'granted') {
    return true;
  }

  if (access === 'not-determined' || access === 'unknown') {
    const granted = await systemPreferences.askForMediaAccess('microphone');

    if (granted) {
      return true;
    }

    // The user just answered the macOS prompt, so the default fallback stays quiet.
    return fallback({hasAsked: true});
  }

  // 'denied' or 'restricted': macOS will not ask again, so explain what to do.
  return fallback();
};

export const hasMicrophoneAccess = () => getMicrophoneAccess() === 'granted';

// Screen Capture

// Same file name that mac-screen-capture-permissions used.
const getScreenCaptureRequestedMarker = () => path.join(app.getPath('userData'), '.has-app-requested-screen-capture-permissions');

// MacOS ties screen capture access to the app's code signature, and every
// local (ad-hoc signed) build has a new one. The executable contains that
// signature, so the marker stores a hash of it: a new build asks macOS again
// instead of going straight to Kap's dialog.
const getBuildFingerprint = () => {
  try {
    return createHash('sha256').update(fs.readFileSync(app.getPath('exe'))).digest('hex');
  } catch {
    return '';
  }
};

const hasRequestedScreenCapture = () => {
  try {
    return fs.readFileSync(getScreenCaptureRequestedMarker(), 'utf8') === getBuildFingerprint();
  } catch {
    return false;
  }
};

const markScreenCaptureRequested = () => {
  try {
    const marker = getScreenCaptureRequestedMarker();
    fs.mkdirSync(path.dirname(marker), {recursive: true});
    fs.writeFileSync(marker, getBuildFingerprint());
  } catch (error) {
    console.error('Could not save that screen capture access was requested:', error);
  }
};

// Listing the screens makes macOS show its own prompt the first time
// and adds Kap to the Screen Recording list in System Settings.
const requestScreenCaptureAccess = async () => {
  try {
    await desktopCapturer.getSources({types: ['screen'], thumbnailSize: {width: 0, height: 0}});
  } catch (error) {
    console.error('Requesting screen capture access failed:', error);
  }
};

// MacOS applies a screen capture grant only after Kap restarts.
const screenCaptureFallback = promptSystemPreferences({
  message: 'Kap cannot record the screen.',
  detail: 'Kap requires screen capture access to record the screen. You can grant this in System Settings → Privacy & Security → Screen Recording. Afterwards, relaunch Kap.',
  systemPreferencesPath: 'Privacy_ScreenCapture',
  quitAfterOpening: true
});

export const hasScreenCaptureAccess = () => systemPreferences.getMediaAccessStatus('screen') === 'granted';

export const ensureScreenCapturePermissions = async (fallback = screenCaptureFallback) => {
  if (hasScreenCaptureAccess()) {
    return true;
  }

  // Electron reports 'denied' both before and after the user was asked,
  // so Kap remembers whether it has already asked macOS.
  if (!hasRequestedScreenCapture()) {
    markScreenCaptureRequested();
    void requestScreenCaptureAccess();
    return false;
  }

  await fallback();
  return false;
};
