import type {BrowserWindow} from 'electron';
import {ipcMain} from 'electron-better-ipc';

type Handler = (data: any, window: BrowserWindow) => unknown;

type Route = {
  forAllWindows?: Handler;
  byWindowId: Map<number, Handler>;
  stop?: () => void;
};

// The electron-better-ipc package allows one handler per channel, but every
// Kap window answers its own copy of channels such as 'kap-window-state'. So
// each channel gets one handler here, which passes the call on to the handler
// of the window that made it, or else to the handler for all windows.
const routes = new Map<string, Route>();

const getRoute = (channel: string) => {
  const existingRoute = routes.get(channel);
  if (existingRoute) {
    return existingRoute;
  }

  const route: Route = {byWindowId: new Map()};
  route.stop = ipcMain.answerRenderer(channel, async (data, window) => {
    if (!window) {
      throw new Error(`'${channel}' was called from outside a window`);
    }

    const handler = route.byWindowId.get(window.id) ?? route.forAllWindows;
    if (!handler) {
      throw new Error(`No handler for '${channel}' in window ${window.id}`);
    }

    return handler(data, window);
  });

  routes.set(channel, route);
  return route;
};

const stopIfUnused = (channel: string, route: Route) => {
  const isUsed = route.forAllWindows !== undefined || route.byWindowId.size > 0;
  if (isUsed || routes.get(channel) !== route) {
    return;
  }

  route.stop?.();
  routes.delete(channel);
};

/**
Answers calls from the renderer on `channel`. With a window, only calls from that window. Returns a function that stops answering.
*/
export function answerRenderer<Data, Result>(channel: string, callback: (data: Data, window: BrowserWindow) => Result): () => void;
export function answerRenderer<Data, Result>(window: BrowserWindow, channel: string, callback: (data: Data, window: BrowserWindow) => Result): () => void;
export function answerRenderer(...arguments_: [string, Handler] | [BrowserWindow, string, Handler]) {
  const [window, channel, callback] = arguments_.length === 2 ? [undefined, ...arguments_] : arguments_;
  const route = getRoute(channel);
  // A new function per registration, so a stale stop function can't remove a later handler.
  const handler: Handler = async (data, callingWindow) => callback(data, callingWindow);

  if (window) {
    const windowId = window.id;
    if (route.byWindowId.has(windowId)) {
      throw new Error(`Window ${windowId} already answers '${channel}'`);
    }

    route.byWindowId.set(windowId, handler);
    return () => {
      if (route.byWindowId.get(windowId) !== handler) {
        return;
      }

      route.byWindowId.delete(windowId);
      stopIfUnused(channel, route);
    };
  }

  if (route.forAllWindows) {
    throw new Error(`'${channel}' already has a handler`);
  }

  route.forAllWindows = handler;
  return () => {
    if (route.forAllWindows !== handler) {
      return;
    }

    route.forAllWindows = undefined;
    stopIfUnused(channel, route);
  };
}

/**
Calls the page in `window` and resolves with its answer. Rejects when the window closes, reloads or has no handler for `channel`.
*/
export const callRenderer = async <Data, Result>(window: BrowserWindow, channel: string, data?: Data) => ipcMain.callRenderer<Data, Result>(window, channel, data);

/**
Like `callRenderer`, for updates that need no answer. A window that is closing or not ready yet only logs a warning.
*/
export const notifyRenderer = <Data>(window: BrowserWindow, channel: string, data?: Data) => {
  callRenderer(window, channel, data).catch((error: unknown) => {
    console.warn(`[ipc] '${channel}' not delivered:`, error instanceof Error ? error.message : error);
  });
};
