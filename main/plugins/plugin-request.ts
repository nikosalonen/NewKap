import got, {type OptionsOfUnknownResponseBody, type RequestError} from 'got';

// Plugins get this as context.request. Kap used to hand them got 9, and the
// published plugins still pass got 9 options, which got 11 renamed, ignores or
// rejects. fromGot9Options translates the ones they use.
export type PluginRequestOptions = Record<string, any>;

const hasHeader = (headers: Record<string, unknown> | undefined, name: string) =>
  Object.keys(headers ?? {}).some(key => key.toLowerCase() === name);

export const fromGot9Options = (pluginOptions: PluginRequestOptions = {}): PluginRequestOptions => {
  const options = {...pluginOptions};

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

  // Got 11 ignores `query` without an error.
  if (options.query !== undefined) {
    options.searchParams ??= options.query;
    delete options.query;
  }

  // Got 9 sent POST when a request had a body and no method. Got 11 sends
  // GET and then throws, because a GET request can't have a body.
  const hasBody = options.body !== undefined || options.json !== undefined || options.form !== undefined;
  if (options.method === undefined && hasBody) {
    options.method = 'POST';
  }

  return options;
};

// Got 9 put these fields on HTTP errors; got 11 keeps them on `error.response`.
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
