import type {AppProps} from 'next/app';
import Head from 'next/head';
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
  const cspQuote = String.fromCodePoint(39);

  return (
    <>
      <Head>
        <meta
          httpEquiv='Content-Security-Policy'
          content={[
            'default-src ' + cspQuote + 'self' + cspQuote + ' file: data:',
            'base-uri ' + cspQuote + 'none' + cspQuote,
            'object-src ' + cspQuote + 'none' + cspQuote,
            'script-src ' + cspQuote + 'self' + cspQuote + ' ' + cspQuote + 'unsafe-inline' + cspQuote,
            'style-src ' + cspQuote + 'self' + cspQuote + ' ' + cspQuote + 'unsafe-inline' + cspQuote,
            'img-src ' + cspQuote + 'self' + cspQuote + ' file: data:',
            'media-src file:',
            'connect-src ' + cspQuote + 'self' + cspQuote + ' https: http://localhost:* ws://localhost:*',
          ].join('; ')}
        />
      </Head>
      <div className={className}>
        <WindowStateProvider>
          <Component {...pageProps}/>
          <GlobalStyles/>
        </WindowStateProvider>
      </div>
    </>
  );
};

export default Kap;
