import {app} from 'electron';
import {
  getAboutMenuItem,
  getExportHistoryMenuItem,
  getOpenFileMenuItem,
  getPreferencesMenuItem,
  getSendFeedbackMenuItem,
} from './common';
import {MenuItemId, type MenuOptions} from './utils';

const getAppMenuItem = (): MenuOptions[number] => ({
  id: MenuItemId.app,
  label: app.name,
  submenu: [
    getAboutMenuItem(),
    {type: 'separator'},
    getPreferencesMenuItem(),
    {type: 'separator'},
    {role: 'services'},
    {type: 'separator'},
    {role: 'hide'},
    {role: 'hideOthers'},
    {role: 'unhide'},
    {type: 'separator'},
    {role: 'quit'},
  ],
});

// eslint-disable-next-line unicorn/name-replacements
export const defaultApplicationMenu = (): MenuOptions => [
  getAppMenuItem(),
  {
    role: 'fileMenu',
    id: MenuItemId.file,
    submenu: [
      getOpenFileMenuItem(),
      {
        type: 'separator',
      },
      {
        role: 'close',
      },
    ],
  },
  {
    role: 'editMenu',
    id: MenuItemId.edit,
  },
  {
    role: 'windowMenu',
    id: MenuItemId.window,
    submenu: [
      {
        role: 'minimize',
      },
      {
        role: 'zoom',
      },
      {
        type: 'separator',
      },
      getExportHistoryMenuItem(),
      {
        type: 'separator',
      },
      {
        role: 'front',
      },
    ],
  },
  {
    id: MenuItemId.help,
    label: 'Help',
    role: 'help',
    submenu: [getSendFeedbackMenuItem()],
  },
];

// eslint-disable-next-line unicorn/name-replacements
export const customApplicationMenu = (modifier: (defaultMenu: ReturnType<typeof defaultApplicationMenu>) => void) => {
  const menu = defaultApplicationMenu();
  modifier(menu);
  return menu;
};

export type MenuModifier = Parameters<typeof customApplicationMenu>[0];
