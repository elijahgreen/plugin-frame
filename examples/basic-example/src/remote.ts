import { PluginRemote } from 'plugin-frame';

interface NetworkRequestInterface {
  body: Blob;
  headers: { [k: string]: string };
  status: number;
  statusText: string;
  url: string;
}
const apis = {
  test: (a: number) => {
    console.log('Remote: ', a);
    return 6;
  },
};

const prepare = {
  networkRequest: (input: RequestInfo, init: RequestInit) => {
    if (init) {
      const requestHeaders = Array.isArray(init.headers)
        ? init.headers
        : Object.entries(init.headers);
      init = {
        headers: requestHeaders,
        mode: init.mode,
        method: init.method,
        signal: undefined,
        credentials: init.credentials,
        body: init.body,
      };
    }
    return [input, init];
  },
};

const complete = {
  networkRequest: (result: NetworkRequestInterface) => {
    return new Response(result.body, {
      headers: new Headers(result.headers),
      status: result.status,
      statusText: result.statusText,
    });
  },
};

let remote = new PluginRemote(apis, {
  prepareMethods: prepare,
  completeMethods: complete,
});
