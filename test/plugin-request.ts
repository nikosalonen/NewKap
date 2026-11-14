import {Buffer} from 'node:buffer';
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import test from 'ava';
import {fromGot9Options, pluginRequest} from '../main/plugins/plugin-request';

type EchoedRequest = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
};

// Answers every request with a JSON description of what it received,
// except /missing, which answers 404.
const server = http.createServer((request, response) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk: string) => {
    body += chunk;
  });
  request.on('end', () => {
    if (request.url === '/missing') {
      response.writeHead(404);
      response.end('gone');
      return;
    }

    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      method: request.method, url: request.url, headers: request.headers, body,
    }));
  });
});

let baseUrl = '';

test.before(async () => {
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after.always(() => {
  server.close();
});

const echoed = (body: unknown) => (typeof body === 'string' ? JSON.parse(body) : body) as EchoedRequest;

// Like kap-dropbox: got 9 picked POST by itself when a body was set.
test('a body without a method is sent as POST', async t => {
  const response = await pluginRequest(baseUrl, {body: 'hello'});
  const request = echoed(response.body);

  t.is(request.method, 'POST');
  t.is(request.body, 'hello');
});

// Like kap-vercel.
test('json: true sends an object body as JSON and parses the reply', async t => {
  const response = await pluginRequest(baseUrl, {json: true, body: {name: 'kap'}});

  t.is(typeof response.body, 'object');
  const request = echoed(response.body);
  t.is(request.method, 'POST');
  t.is(request.headers['content-type'], 'application/json');
  t.is(request.headers.accept, 'application/json');
  t.deepEqual(JSON.parse(request.body), {name: 'kap'});
});

// Like kap-telegram.
test('query becomes the query string', async t => {
  const response = await pluginRequest(`${baseUrl}/status`, {method: 'GET', query: {state: 'abc'}, json: true});
  const request = echoed(response.body);

  t.is(request.method, 'GET');
  t.is(request.url, '/status?state=abc');
});

test('form: true sends an object body as a form', async t => {
  const response = await pluginRequest(baseUrl, {form: true, body: {title: 'Kap'}});
  const request = echoed(response.body);

  t.is(request.method, 'POST');
  t.is(request.headers['content-type'], 'application/x-www-form-urlencoded');
  t.is(request.body, 'title=Kap');
});

test('HTTP errors keep the fields got 9 put on them', async t => {
  const error = await t.throwsAsync<Error & Record<string, unknown>>(pluginRequest(`${baseUrl}/missing`, {retry: 0}));

  t.is(error?.statusCode, 404);
  t.is(error?.statusMessage, 'Not Found');
  t.is(error?.body, 'gone');
});

test('the request can still be canceled and report progress', async t => {
  const request = pluginRequest(baseUrl, {body: 'hello'});

  t.is(typeof request.cancel, 'function');
  t.is(typeof request.on, 'function');
  await request;
});

test('got 11 options pass through unchanged', t => {
  const options = {
    method: 'PUT', body: Buffer.from('x'), responseType: 'buffer', searchParams: {a: '1'}, timeout: 1000, retry: 0,
  };

  t.deepEqual(fromGot9Options(options), options);
});

test('json: true keeps an accept header the plugin set', t => {
  /* eslint-disable @typescript-eslint/naming-convention -- header names as plugins write them */
  const options = fromGot9Options({json: true, headers: {Accept: 'text/plain'}});

  t.deepEqual(options.headers, {Accept: 'text/plain'});
  /* eslint-enable @typescript-eslint/naming-convention */
});

test('the plugin’s options object is not changed', t => {
  const options = {json: true, body: {name: 'kap'}, query: {a: '1'}};

  fromGot9Options(options);

  t.deepEqual(options, {json: true, body: {name: 'kap'}, query: {a: '1'}});
});
