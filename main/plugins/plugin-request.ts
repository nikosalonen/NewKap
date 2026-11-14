import {Readable} from 'node:stream';
import got, {type OptionsOfUnknownResponseBody, type RequestError} from 'got';

// Plugins get this as context.request. Kap used to hand them got 9, and the
// published plugins still pass got 9 options. Got 11 renamed some (query,
// encoding: null, retry.retries), gave json and form a new meaning, and is
// stricter about bodies and headers. fromGot9Options translates these.
// docs/plugins.md lists the got 9 options it leaves alone.
export type PluginRequestOptions = Record<string, any>;

const hasHeader = (headers: Record<string, unknown> | undefined, name: string) =>
  Object.keys(headers ?? {}).some(key => key.toLowerCase() === name);

// Got 9 piped any object with a pipe() method. Got 11 only takes a core
// stream.Readable, so streams from readable-stream (through2 uses it) need
// wrapping. Got 11 handles form-data streams itself, so they stay as they are.
const isOldStyleStream = (body: any) =>
  typeof body?.pipe === 'function'
  && !(body instanceof Readable)
  && typeof body.getBoundary !== 'function';

export const fromGot9Options = (pluginOptions: PluginRequestOptions = {}): PluginRequestOptions => {
  const options = {...pluginOptions};

  // Got 9 treated null as "not set". Got 11 counts a null body as a body,
  // and throws on null header values.
  if (options.body === null) {
    delete options.body;
  }

  options.headers &&= Object.fromEntries(Object.entries(options.headers).filter(([, value]) => value !== null));

  // Got 9: `json: true` stringifies `body` and parses the reply.
  // Got 11: `json` is the body itself, and `responseType` asks for parsing.
  if (options.json === true) {
    options.responseType ??= 'json';

    if (!hasHeader(options.headers, 'accept')) {
      options.headers = {...options.headers, accept: 'application/json'};
    }

    if (options.body === undefined) {
      delete options.json;
    } else {
      options.json = options.body;
      delete options.body;
    }
  } else if (options.json === false) {
    delete options.json;
  }

  // Got 9: `form: true` encodes `body`. Got 11: `form` is the body itself.
  if (options.form === true) {
    options.form = options.body;
    delete options.body;
  } else if (options.form === false) {
    delete options.form;
  }

  // Got 11 ignores `query` without an error, so the query string would vanish.
  if (options.query !== undefined) {
    options.searchParams ??= options.query;
    delete options.query;
  }

  // Got 9 returned a Buffer for `encoding: null`. Got 11 throws on it.
  if (options.encoding === null) {
    options.responseType ??= 'buffer';
    delete options.encoding;
  }

  // Got 11 calls `retry.retries` `retry.limit`, and ignores `retries`.
  if (typeof options.retry?.retries === 'number') {
    const {retries, ...retry} = options.retry;
    options.retry = {limit: retries, ...retry};
  }

  if (isOldStyleStream(options.body)) {
    options.body = new Readable().wrap(options.body);
  }

  // Got 9 sent POST when a request had a body and no method. Got 11 defaults
  // to GET and throws before sending, because a GET request can't have a body.
  const hasBody = options.body !== undefined || options.json !== undefined || options.form !== undefined;
  if (options.method === undefined && hasBody) {
    options.method = 'POST';
  }

  return options;
};

// Got 9 put these fields on errors that came with a response. Got 11 keeps
// them only on `error.response`.
const addGot9ErrorFields = (error: RequestError) => {
  const {response} = error;
  if (response) {
    Object.assign(error, {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      headers: response.headers,
      body: response.body,
    });
  }

  return error;
};

const pluginGot = got.extend({hooks: {beforeError: [addGot9ErrorFields]}});

// eslint-disable-next-line @typescript-eslint/promise-function-async -- plugins need got's own promise, which has cancel() and progress events
export const pluginRequest = (url: string | URL, options?: PluginRequestOptions) =>
  pluginGot(url, fromGot9Options(options) as OptionsOfUnknownResponseBody);
