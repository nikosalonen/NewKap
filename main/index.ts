import process from 'node:process';
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {mark} from './utils/perf';
import {listenToSignalFirst} from './utils/signals';
import {setupRendererApi} from './renderer-api';

mark('main module entered');

app.setName('Kap');
process.title = 'Kap';

if (process.platform === 'darwin') {
  app.setActivationPolicy('accessory');

  const preserveMenuBarPolicy = () => {
    if ((app as any).__kapDockVisible) {
      return;
    }

    app.setActivationPolicy('accessory');
  };

  app.on('activate', preserveMenuBarPolicy);
  app.on('browser-window-focus', preserveMenuBarPolicy);
  app.on('browser-window-created', (_event, window) => {
    window.on('show', preserveMenuBarPolicy);
  });
}

const isMoveToAppsFolderPrompt = (text?: string) => text?.includes('Applications folder') ?? false;

const _origShowMessageBoxSync = dialog.showMessageBoxSync;
dialog.showMessageBoxSync = ((...args: any[]) => {
  const options: any = args.length === 1 ? args[0] : args[1];
  return isMoveToAppsFolderPrompt(options?.message) ? 1 : _origShowMessageBoxSync.apply(dialog, args as any);
}) as any;

const _origShowMessageBox = dialog.showMessageBox;
dialog.showMessageBox = (async (...args: any[]) => {
  const options: any = args.length === 1 ? args[0] : args[1];
  return isMoveToAppsFolderPrompt(options?.message) ? {response: 1, checkboxChecked: false} : _origShowMessageBox.apply(dialog, args as any);
}) as any;

const _origShowErrorBox = dialog.showErrorBox;
dialog.showErrorBox = ((title: string, content: string) => isMoveToAppsFolderPrompt(title) ? undefined : _origShowErrorBox.call(dialog, title, content));

Object.defineProperty(app, 'isInApplicationsFolder', {
  value: () => true,
  writable: true,
  configurable: true,
});

const filesToOpen: string[] = [];
let onExitCleanupComplete = false;

app.commandLine.appendSwitch('--enable-features', 'OverlayScrollbar');

app.on('open-file', (event, filePath) => {
  event.preventDefault();

  if (app.isReady()) {
    require('./utils/open-files').openFiles(filePath);
  } else {
    filesToOpen.push(filePath);
  }
});

let pendingDeepLink: string | undefined;
let deepLinkReady = false;

export const markDeepLinkReady = () => {
  deepLinkReady = true;
  if (!pendingDeepLink) {
    return;
  }

  const url = pendingDeepLink;
  pendingDeepLink = undefined;
  require('./utils/deep-linking').handleDeepLink(url);
};

app.on('will-finish-launching', () => {
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (deepLinkReady) {
      require('./utils/deep-linking').handleDeepLink(url);
    } else {
      pendingDeepLink = url;
    }
  });
});

app.on('window-all-closed', () => {
  app.dock?.hide();
});

(async () => {
  await app.whenReady();
  mark('app.whenReady resolved');

  if (process.platform === 'darwin') {
    app.setActivationPolicy('accessory');
  }

  setupRendererApi();

  app.dock?.hide();
  app.setAboutPanelOptions({
    applicationName: 'Kap',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © Kap Contributors',
  });

  const tray = new Tray(path.join(__dirname, '..', 'static', 'menubarDefaultTemplate.png'));
  mark('tray constructed');

  let trayReady = false;
  let pendingOpenCropper = false;

  tray.on('click', () => {
    if (!trayReady) {
      pendingOpenCropper = true;
      return;
    }

    const {windowManager} = require('./windows/manager');
    windowManager.cropper?.open();
  });

  tray.on('right-click', () => {
    if (!trayReady) {
      tray.popUpContextMenu(Menu.buildFromTemplate([
        {label: 'Kap is loading…', enabled: false},
      ]));
    }
  });

  const tick = async () => delay(0);

  // Auto-detect production build — if static output exists, skip the
  // Next.js dev server entirely.  This eliminates the ~16s prepareNext
  // delay, the ~15s pre-compilation wait, and the fsevents crash on
  // Ctrl+C (no file-watcher thread).
  const staticDir = path.join(__dirname, '..', 'renderer', 'out');
  const hasStaticBuild = fs.existsSync(path.join(staticDir, 'cropper.html'));
  if (hasStaticBuild) {
    process.env['ELECTRON_IS_DEV'] = '0';
  }

  setImmediate(async () => {
    require('./utils/errors').setupErrorHandling();
    await tick();

    require('./utils/protocol').setupProtocol();

    // In production electron-next installs the file-protocol interceptor that
    // maps /_next assets into renderer/out. It must run for static builds too.
    const prepareNext = require('electron-next');
    await prepareNext('./renderer');

    // Pre-compile the cropper page by loading it in a hidden window.
    // Only needed in dev mode (static builds serve instantly).
    if (!hasStaticBuild && !app.isPackaged) {
      const preloadWin = new BrowserWindow({
        show: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          preload: path.join(__dirname, 'preload.js'),
        },
      });
      await preloadWin.loadURL('http://localhost:8000/cropper');
      preloadWin.destroy();
    }

    await tick();

    require('./remote-states').setupRemoteStates();

    // Phase 2: Only load cropper first — defer all other window modules
    mark('before cropper require');
    require('./windows/cropper');
    mark('cropper module loaded');
    await tick();

    // Now replace the temporary tray with the full-featured one
    tray.removeAllListeners('click');
    tray.removeAllListeners('right-click');
    const {initializeTray: wireUpTray} = require('./tray');
    wireUpTray(tray);
    trayReady = true;
    mark('tray ready');

    if (pendingOpenCropper) {
      pendingOpenCropper = false;
      const {windowManager} = require('./windows/manager');
      windowManager.cropper?.open();
    }

    markDeepLinkReady();

    await tick();

    // Phase 3: Defer non-critical window modules and init
    setImmediate(() => {
      mark('deferred load starting');
      require('./windows/editor');
      require('./windows/config');
      require('./windows/dialog');
      require('./windows/exports');
      require('./windows/preferences');
      mark('deferred windows loaded');
    });

    await tick();

    const {initializeDevices} = require('./utils/devices');
    const {initializeGlobalAccelerators} = require('./global-accelerators');
    const {setUpExportsListeners} = require('./export');

    initializeDevices();
    initializeGlobalAccelerators();
    setUpExportsListeners();

    if (!app.isDefaultProtocolClient('kap')) {
      app.setAsDefaultProtocolClient('kap');
    }

    await tick();

    if (filesToOpen.length > 0) {
      require('./utils/open-files').openFiles(...filesToOpen);
    }

    // Offers a recording that a crash or an exit on a signal left behind. Upstream
    // 50dae14 dropped this call from the startup without files, so it ran only with files.
    require('./recording-history').hasActiveRecording().catch(console.error);

    if (app.isPackaged) {
      const {plugins} = require('./plugins');
      plugins.upgrade().catch((error: any) => {
        console.log('Plugin upgrade failed (non-fatal):', error);
      });
    }

    setTimeout(() => {
      if (!app.isPackaged) {
        return;
      }

      const {checkForUpdates} = require('./updater');

      const doCheck = () => checkForUpdates({silent: true});

      setInterval(doCheck, 60 * 60 * 1000);
      doCheck();
    }, 10_000);
  });
})();

const QUIT_TIMEOUT_MS = 5000;

const performQuitCleanup = async () => {
  try {
    const {stopRecordingWithNoEdit} = require('./aperture');
    await stopRecordingWithNoEdit();
  } catch (error) {
    console.error('Error stopping recording on quit:', error);
  }

  try {
    const {cleanPastRecordings} = require('./recording-history');
    cleanPastRecordings();
  } catch (error) {
    console.error('Error cleaning recordings on quit:', error);
  }
};

app.on('before-quit', (event: any) => {
  if (onExitCleanupComplete) {
    return;
  }

  event.preventDefault();

  const forceQuit = setTimeout(() => {
    console.log('Force quitting after timeout');
    onExitCleanupComplete = true;
    app.exit(0);
  }, QUIT_TIMEOUT_MS);

  performQuitCleanup().finally(() => {
    clearTimeout(forceQuit);
    onExitCleanupComplete = true;
    app.quit();
  });
});

let isExitingOnSignal = false;

// A signal such as `kill` cleans up like a normal quit, including discarding an active
// recording, but exits without the questions a normal quit can ask. The editor's
// "discard this recording?" kept Kap running.
const handleSignal = (signal: 'SIGTERM' | 'SIGINT') => () => {
  // The when-exit package (through electron-store) sends the signal again after its own cleanup.
  if (isExitingOnSignal) {
    return;
  }

  isExitingOnSignal = true;
  console.log(`Received ${signal}, quitting...`);
  onExitCleanupComplete = true;

  const forceExit = setTimeout(() => {
    app.exit(0);
  }, QUIT_TIMEOUT_MS);

  performQuitCleanup().finally(() => {
    clearTimeout(forceExit);
    app.exit(0);
  });
};

// Electron installs its own signal handlers while it starts, so take the signals over once it's ready.
(async () => {
  await app.whenReady();

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    listenToSignalFirst(signal, handleSignal(signal));
  }
})();
