import sinon from 'sinon';

type Answer = (data: any, window?: any) => unknown;

// The handlers that main/utils/ipc.ts registers, so tests can call them the way a page would.
export const handlers = new Map<string, Answer>();

export const ipcMain = {
  answerRenderer(channel: string, callback: Answer) {
    if (handlers.has(channel)) {
      throw new Error(`Attempted to register a second handler for '${channel}'`);
    }

    handlers.set(channel, callback);
    return () => {
      handlers.delete(channel);
    };
  },
  callRenderer: sinon.stub().resolves(undefined),
};
