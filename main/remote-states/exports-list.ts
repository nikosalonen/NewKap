import type {ExportsListRemoteState, RemoteStateHandler} from '../common/types';
import Export from '../export';

const exportsListRemoteState: RemoteStateHandler<ExportsListRemoteState> = sendUpdate => {
  const getState = () => Export.exportsMap.keys().toArray();

  const subscribe = () => {
    const callback = () => {
      sendUpdate(Export.exportsMap.keys().toArray());
    };

    Export.events.on('added', callback);
    return () => {
      Export.events.off('added', callback);
    };
  };

  return {
    subscribe,
    getState,
    actions: {},
  };
};

export default exportsListRemoteState;
export const name = 'exports-list';
