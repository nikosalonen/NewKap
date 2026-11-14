import {Buffer} from 'node:buffer';
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import {Stream} from 'node:stream';
import test from 'ava';
import {Format} from '../main/common/types';
import type {InstalledPlugin} from '../main/plugins/plugin';
import {fromGot9Options, pluginRequest} from '../main/plugins/plugin-request';
import {ShareServiceContext} from '../main/plugins/service-context';

type EchoedRequest = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
};

type GotError = Error & Record<string, unknown>;

// Answers every request with a JSON description of what it received, except
// /missing, which answers 404, and /slow, which never answers.
const server = http.createServer((request, response) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk: string) => {
    body += chunk;
  });
  request.on('end', () => {
    if (request.url === '/slow') {
      return;
    }

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

const listen = async (httpServer: http.Server) => {
  await new Promise<void>(resolve => {
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  return (httpServer.address() as AddressInfo).port;
};

let baseUrl = '';

test.before(async () => {
  baseUrl = `http://127.0.0.1:${await listen(server)}`;
});

test.after.always(() => {
  server.closeAllConnections();
  server.close();
});

const echoed = (body: unknown) => (typeof body === 'string' ? JSON.parse(body) : body) as EchoedRequest;

// A stream with pipe() that isn't a core stream.Readable, like the
// readable-stream streams through2 makes. kap-vercel uploads one.
const oldStyleStream = (text: string) => {
  const stream = new Stream();
  setImmediate(() => {
    stream.emit('data', Buffer.from(text));
    stream.emit('end');
  });
  return stream;
};

// The kap-dropbox plugin relies on got 9 picking POST when a body is set.
test('a body without a method is sent as POST', async t => {
  const response = await pluginRequest(baseUrl, {body: 'hello'});
  const request = echoed(response.body);

  t.is(request.method, 'POST');
  t.is(request.body, 'hello');
});

// The kap-vercel plugin's deployment call.
test('json: true sends an object body as JSON and parses the reply', async t => {
  const response = await pluginRequest(baseUrl, {json: true, body: {name: 'kap'}});

  t.is(typeof response.body, 'object');
  const request = echoed(response.body);
  t.is(request.method, 'POST');
  t.is(request.headers['content-type'], 'application/json');
  t.is(request.headers.accept, 'application/json');
  t.deepEqual(JSON.parse(request.body), {name: 'kap'});
});

// The kap-telegram plugin's status poll.
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

test('form: true with json: true sends a form and parses the reply', async t => {
  const response = await pluginRequest(baseUrl, {form: true, json: true, body: {title: 'Kap'}});

  t.is(typeof response.body, 'object');
  const request = echoed(response.body);
  t.is(request.method, 'POST');
  t.is(request.headers['content-type'], 'application/x-www-form-urlencoded');
  t.is(request.headers.accept, 'application/json');
  t.is(request.body, 'title=Kap');
});

test('a stream that isn’t a core stream.Readable is still sent', async t => {
  const response = await pluginRequest(baseUrl, {method: 'PUT', body: oldStyleStream('video bytes')});
  const request = echoed(response.body);

  t.is(request.method, 'PUT');
  t.is(request.body, 'video bytes');
});

test('encoding: null returns a Buffer', async t => {
  const response = await pluginRequest(baseUrl, {encoding: null});

  t.true(Buffer.isBuffer(response.body));
});

test('HTTP errors keep the fields got 9 put on them', async t => {
  const error = await t.throwsAsync<GotError>(pluginRequest(`${baseUrl}/missing`, {retry: 0}));

  t.is(error?.statusCode, 404);
  t.is(error?.statusMessage, 'Not Found');
  t.is(error?.body, 'gone');
});

test('errors without a response pass through the error hook', async t => {
  const closedServer = http.createServer();
  const port = await listen(closedServer);
  closedServer.close();

  const error = await t.throwsAsync<GotError>(pluginRequest(`http://127.0.0.1:${port}`, {retry: 0}));

  t.is(error?.code, 'ECONNREFUSED');
  t.is(error?.statusCode, undefined);
});

test('cancel() stops a request in flight', async t => {
  const request = pluginRequest(`${baseUrl}/slow`);
  t.is(typeof request.on, 'function');

  setTimeout(() => {
    request.cancel();
  }, 50);
  const error = await t.throwsAsync<GotError>(request);

  t.true(error?.isCanceled);
});

test('cancel() on the context still cancels requests after one got rejected up front', async t => {
  const context = new ShareServiceContext({
    plugin: {config: {}} as unknown as InstalledPlugin,
    onProgress() {},
    filePath: async () => '',
    format: Format.gif,
    prettyFormat: 'GIF',
    defaultFileName: 'Kapture',
    onCancel() {},
  });
  // Got rejects an invalid method before it starts, and returns a promise without cancel().
  const rejected = context.request(baseUrl, {method: 123});
  const slow = context.request(`${baseUrl}/slow`);

  t.notThrows(() => {
    context.cancel();
  });
  await t.throwsAsync(rejected);
  const error = await t.throwsAsync<GotError>(slow);
  t.true(error?.isCanceled);
});

test('got 11 options pass through unchanged', t => {
  const options = {
    method: 'PUT', body: Buffer.from('x'), responseType: 'buffer', searchParams: {a: '1'}, timeout: 1000, retry: 0,
  };

  t.deepEqual(fromGot9Options(options), options);
});

test('json: true without a body only asks for a parsed reply', t => {
  t.deepEqual(fromGot9Options({json: true}), {responseType: 'json', headers: {accept: 'application/json'}});
});

test('json: true keeps an accept header the plugin set', t => {
  /* eslint-disable @typescript-eslint/naming-convention -- header names as plugins write them */
  const options = fromGot9Options({json: true, headers: {Accept: 'text/plain'}});

  t.deepEqual(options.headers, {Accept: 'text/plain'});
  /* eslint-enable @typescript-eslint/naming-convention */
});

test('json: false and form: false are dropped', t => {
  t.deepEqual(fromGot9Options({json: false, form: false}), {});
});

test('query doesn’t replace searchParams the plugin set', t => {
  t.deepEqual(fromGot9Options({query: {a: '1'}, searchParams: {b: '2'}}), {searchParams: {b: '2'}});
});

test('a method the plugin set is kept', t => {
  t.is(fromGot9Options({method: 'PUT', body: 'x'}).method, 'PUT');
});

test('a null body and null headers count as not set', t => {
  t.deepEqual(fromGot9Options({body: null, headers: {'x-empty': null, 'x-kept': 'yes'}}), {headers: {'x-kept': 'yes'}});
});

test('retry.retries becomes retry.limit', t => {
  t.deepEqual(fromGot9Options({retry: {retries: 0, methods: ['GET']}}).retry, {limit: 0, methods: ['GET']});
});

test('the plugin’s options object is not changed', t => {
  const options = {json: true, body: {name: 'kap'}, query: {a: '1'}};

  fromGot9Options(options);

  t.deepEqual(options, {json: true, body: {name: 'kap'}, query: {a: '1'}});
});
