import type {AppProps} from 'next/app';
import {useState, useEffect} from 'react';
import classNames from 'classnames';
import useDarkMode from '../hooks/dark-mode';
import GlobalStyles from '../utils/global-styles';
import {WindowStateProvider} from '../hooks/window-state';

const Kap = (props: AppProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleError = (event: ErrorEvent) => {
      console.error('[renderer] uncaught error', event.error ?? event.message);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[renderer] unhandled rejection', event.reason);
    };

    addEventListener('error', handleError);
    addEventListener('unhandledrejection', handleRejection);

    return () => {
      removeEventListener('error', handleError);
      removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return isMounted ? <MainApp {...props}/> : null;
};

const MainApp = ({Component, pageProps}: AppProps) => {
  const isDarkMode = useDarkMode();
  const className = classNames('cover-window', {dark: isDarkMode});

  // The Content-Security-Policy is in pages/_document.tsx.
  return (
    <div className={className}>
      <WindowStateProvider>
        <Component {...pageProps}/>
        <GlobalStyles/>
      </WindowStateProvider>
    </div>
  );
};

export default Kap;
