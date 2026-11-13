import {
  Html,
  Head,
  Main,
  NextScript,
} from 'next/document';

// The policy sits in the static HTML, so it applies before any script runs.
// The packaged app loads pages from file: (electron-next maps /_next to
// renderer/out); dev mode loads them from the Next dev server on localhost.
const contentSecurityPolicy = [
  'default-src \'self\' file: data:',
  'base-uri \'none\'',
  'object-src \'none\'',
  'script-src \'self\' \'unsafe-inline\'',
  'style-src \'self\' \'unsafe-inline\'',
  'img-src \'self\' file: data:',
  'media-src file:',
  'connect-src \'self\' https: http://localhost:* ws://localhost:*',
].join('; ');

const Document = () => (
  <Html>
    <Head>
      <meta httpEquiv='Content-Security-Policy' content={contentSecurityPolicy}/>
    </Head>
    <body>
      <Main/>
      <NextScript/>
    </body>
  </Html>
);

export default Document;
