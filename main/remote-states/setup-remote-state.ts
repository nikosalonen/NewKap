import type {BrowserWindow} from 'electron';
import {answerRenderer, notifyRenderer} from '../utils/ipc';
import {getChannelNames, type RemoteState} from './utils';

const setupRemoteState = async <State, Actions extends Record<string, (...args: any[]) => any>>(name: string, callback: RemoteState<State, Actions>) => {
  const channelNames = getChannelNames(name);

  const renderersMap = new Map<string, Set<BrowserWindow>>();

  const sendUpdate = async (state?: State, id?: string) => {
    if (id) {
      const renderers = renderersMap.get(id) ?? new Set();

      for (const renderer of renderers) {
        notifyRenderer(renderer, channelNames.stateUpdated, {state, id});
      }

      return;
    }

    for (const [windowId, renderers] of renderersMap) {
      for (const renderer of renderers) {
        if (renderer && !renderer.isDestroyed()) {
          notifyRenderer(renderer, channelNames.stateUpdated, {state: state ?? (await getState?.(windowId))});
        } else {
          renderers.delete(renderer);
        }
      }
    }
  };

  const {getState, actions = {}, subscribe} = await callback(sendUpdate);

  answerRenderer(channelNames.subscribe, (customId: string, window: BrowserWindow) => {
    const id = customId ?? window.id.toString();

    if (!renderersMap.has(id)) {
      renderersMap.set(id, new Set());
    }

    renderersMap.get(id)?.add(window);
    const unsubscribe = subscribe?.(id);

    window.on('close', () => {
      renderersMap.get(id)?.delete(window);
      unsubscribe?.();
    });

    return Object.keys(actions);
  });

  answerRenderer(channelNames.getState, async (customId: string, window: BrowserWindow) => {
    const id = customId ?? window.id.toString();
    return getState(id);
  });

  answerRenderer(channelNames.callAction, ({key, data, id: customId}: any, window: BrowserWindow) => {
    const id = customId ?? window.id.toString();
    return (actions as any)[key]?.(id, ...data);
  });
};

export default setupRemoteState;
