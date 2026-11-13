import {
  createContext,
  use,
  useState,
  useEffect,
  type ReactNode,

} from 'react';
import {ipcRenderer as ipc} from '../utils/ipc';
import answerMain from '../utils/answer-main';

const WindowStateContext = createContext<any>(undefined);

export const WindowStateProvider = (props: {children: ReactNode}) => {
  const [windowState, setWindowState] = useState();

  useEffect(() => {
    const getInitialState = async () => {
      setWindowState(await ipc.callMain('kap-window-state'));
    };

    void getInitialState();

    return answerMain('kap-window-state', (newState: any) => {
      setWindowState(newState);
    });
  }, []);

  return (
    <WindowStateContext value={windowState}>
      {props.children}
    </WindowStateContext>
  );
};

// Should not be used directly
// Each page should export its own typed hook
const useWindowState = <T,>() => use<T>(WindowStateContext);

export default useWindowState;
