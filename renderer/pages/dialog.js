import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import Actions from '../components/dialog/actions';
import Icon from '../components/dialog/icon';
import Body from '../components/dialog/body';
import {ipcRenderer as ipc} from '../utils/ipc';
import answerMain from '../utils/answer-main';

let measureResolve;

const Dialog = () => {
  const [data, setData] = useState();
  const [measureSize, setMeasureSize] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const containerRef = useRef(null);

  const performAction = useCallback(async index => {
    if (isDisabled && data.cancelId !== index) {
      return;
    }

    setIsDisabled(true);
    return ipc.callMain(`dialog-action-${data.id}`, index);
  }, [data, isDisabled, setIsDisabled]);

  useEffect(() => answerMain('data', async newData => new Promise(resolve => {
    setData(newData);
    setMeasureSize(true);
    measureResolve = resolve;
  })), []);

  useEffect(() => {
    if (data) {
      setIsDisabled(false);
    }

    if (!data?.cancelId) {
      return;
    }

    const handler = event => {
      if (event.code === 'Escape') {
        performAction(data.cancelId);
      }
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [data, performAction, isDisabled, setIsDisabled]);

  useEffect(() => {
    if (!(measureSize && measureResolve)) {
      return;
    }

    const {offsetWidth, offsetHeight} = containerRef.current;
    measureResolve({width: offsetWidth, height: offsetHeight});
    measureResolve = undefined;
    setMeasureSize(false);
  }, [measureSize]);

  if (!data) {
    return null;
  }

  return (
    <div ref={containerRef} className='dialog-container'>
      <Icon/>
      <div className='dialog-content'>
        <Body title={data.title} message={data.message} detail={data.detail}/>
        <Actions buttons={data.buttons} performAction={performAction} defaultId={data.defaultId}/>
      </div>
      <style jsx global>{`
        html {
          font-size: 62.5%;
        }

        html,
        body {
          margin: 0;
          width: 100vw;
          height: 100vh;
          font-family: system-ui, 'Helvetica Neue', sans-serif;
          background: transparent;
        }

        .dialog-container {
          display: flex;
          width: ${measureSize ? 'max-content' : '100%'};
          height: ${measureSize ? 'max-content' : '100%'};
        }

        .dialog-content {
          display: flex;
          flex-direction: column;
          width: min-content;
          flex: 1;
        }

        button {
          border: 1px solid rgba(0, 0, 0, 0.2);
          box-shadow: inset 0px 1px 0px 0px rgba(255, 255, 255, 0.04), 0px 1px 0px 0px rgba(0, 0, 0, 0.05);
          outline: none;
        }

        button:active,
        button:focus {
          border-color: var(--kap);
          outline: none;
        }

        .dark button {
          background: rgba(255, 255, 255, 0.1);
          border: none;
        }

        .dark button:active,
        .dark button:focus {
          background: hsla(0, 0%, 100%, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Dialog;
