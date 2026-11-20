import {app, BrowserWindow, dialog} from 'electron';
import fs from 'node:fs';
import type {EditorWindowState} from '../common/types';
import type {Video} from '../video';
import {MenuItemId} from '../menus/utils';
import {saveSnapshot} from '../utils/image-preview';
import KapWindow from './kap-window';
import {windowManager} from './manager';
import {EDITOR_MIN_HEIGHT, EDITOR_MIN_WIDTH} from './editor-size';

// The size a new editor opens at: a 900px wide 16:9 video plus the 48px options bar.
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = (DEFAULT_WIDTH * 9 / 16) + 48;

const editors = new Map();
const editorsWithNotSavedDialogs = new Map();

const open = async (video: Video) => {
  if (editors.has(video.filePath)) {
    editors.get(video.filePath).show();
    return;
  }

  // Preview generation can be slow for formats like ProRes; wait here so the editor opens with playable media.
  await video.whenPreviewReady();

  const editorKapWindow = new KapWindow<EditorWindowState>({
    title: video.title,
    minWidth: EDITOR_MIN_WIDTH,
    minHeight: EDITOR_MIN_HEIGHT,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    backgroundColor: '#222222',
    dock: true,
    webPreferences: {
      webSecurity: app.isPackaged, // Disable webSecurity in dev to load video over file:// protocol while serving over insecure http, this is not needed in production where we use file:// protocol for html serving.
    },
    frame: false,
    transparent: true,
    vibrancy: 'window',
    route: 'editor',
    initialState: {
      previewFilePath: video.previewPath!,
      filePath: video.filePath,
      fps: video.fps!,
      title: video.title,
    },
    menu(defaultMenu) {
      if (!video.isNewRecording) {
        return;
      }

      const fileMenu = defaultMenu.find(item => item.id === MenuItemId.file);

      if (!fileMenu) {
        return;
      }

      const submenu = fileMenu.submenu as Electron.MenuItemConstructorOptions[];
      const index = submenu.findIndex(item => item.id === MenuItemId.openVideo);

      if (index === -1) {
        return;
      }

      submenu.splice(index + 1, 0, {
        type: 'separator',
      }, {
        label: 'Save Original…',
        id: MenuItemId.saveOriginal,
        accelerator: 'Command+S',
        click: async () => saveOriginal(video),
      });
    },
  });

  const editorWindow = editorKapWindow.browserWindow;

  editors.set(video.filePath, editorWindow);

  if (video.isNewRecording) {
    editorWindow.setDocumentEdited(true);
    editorWindow.on('close', (event: any) => {
      editorsWithNotSavedDialogs.set(video.filePath, true);
      const buttonIndex = dialog.showMessageBoxSync(editorWindow, {
        type: 'question',
        buttons: [
          'Discard',
          'Cancel',
        ],
        defaultId: 0,
        cancelId: 1,
        message: 'Are you sure that you want to discard this recording?',
        detail: 'You will no longer be able to edit and export the original recording.',
      });

      if (buttonIndex === 1) {
        event.preventDefault();
      }

      editorsWithNotSavedDialogs.delete(video.filePath);
    });
  }

  editorWindow.on('closed', () => {
    editors.delete(video.filePath);
  });

  editorKapWindow.answerRenderer('save-snapshot', (time: number) => {
    saveSnapshot(video, time);
  });
};

const saveOriginal = async (video: Video) => {
  const {filePath} = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow()!, {
    defaultPath: `${video.title}.mp4`,
  });

  if (filePath) {
    await fs.promises.copyFile(video.filePath, filePath, fs.constants.COPYFILE_FICLONE);
  }
};

const areAnyBlocking = () => {
  if (editorsWithNotSavedDialogs.size > 0) {
    const [path] = editorsWithNotSavedDialogs.keys();
    editors.get(path).focus();
    return true;
  }

  return false;
};

windowManager.setEditor({
  open,
  areAnyBlocking,
});
