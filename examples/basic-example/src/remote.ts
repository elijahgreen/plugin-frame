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
    console.log("Let's go remote ", a);
    return 6;
  },
};

const prepare = {
  networkRequest: (input: RequestInfo, init: RequestInit) => {
    if (init) {
      init = {
        headers: Object.entries(init.headers),
        mode: init.mode,
        method: init.method,
        signal: init.signal,
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
  prepareFuncs: prepare,
  completeFuncs: complete,
});
