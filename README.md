# plugin-frame

plugin-frame is a library for running untrusted code in a sandboxed iframe.

### Installation

```sh
npm install plugin-frame
```

If you are loading plugin-frame in an iframe from another url using `frameSrc`, an instance of `ChildPlugin` must be created. If not using a bundler, it can be loaded from a cdn.

Parent:

```js
import { PluginFrame } from 'plugin-frame';

const pluginFrame = new PluginFrame({}, { frameSrc: 'pluginloader.html' });
```

pluginloader.html:

```html
...
<script type="module">
  import { ChildPlugin } from 'https://cdn.jsdelivr.net/npm/plugin-frame@0.1.1/dist/plugin-frame.esm.js';
  let plugin = new ChildPlugin({});
</script>
...
```

### Usage

```js
import { PluginFrame } from 'plugin-frame';

const pluginFrame = new PluginFrame({});
pluginFrame.ready().then(async () => {
  await pluginFrame.executeCode(
    "console.log('This is running in a sandboxed iframe')"
  );
});
```

By default the child iframe remote methods are stored in a variable called `application`.

```js
import { PluginFrame } from 'plugin-frame';

const api = {
  test: () => {
    console.log('Running in parent');
  },
};

const code = 'application.test()';
const pluginFrame = new PluginFrame(api);
pluginFrame.ready().then(async () => {
  await pluginFrame.executeCode(code);
});
```

Arguments and return values are sent using [postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window.postMessage) and therefore must be serialiazble with the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).

However arguments can be modified before they are sent and responses after they are received using `prepareMethods` and `completeMethods`.

For example:

Parent Code

```js
const api = {
  async networkRequest(input: RequestInfo, init: RequestInit) {
    const response = await fetch(input, init);
    const body = await response.blob();
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const result = {
      body: body,
      headers: responseHeaders,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    };
    return result;
  },
};
let pluginFrame = new PluginFrame(api);
pluginFrame.ready().then(async () => {
  await pluginFrame.executeCode(
    "application.networkRequest('https://example.org/').then(response => console.log(response))"
  );
});
```

Iframe Code

```js
import { ChildPlugin } from 'plugin-frame';

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
  networkRequest: (result) => {
    return new Response(result.body, {
      headers: new Headers(result.headers),
      status: result.status,
      statusText: result.statusText,
    });
  },
};

let plugin = new ChildPlugin(apis, {
  prepareMethods: prepare,
  completeMethods: complete,
});
```

plugin-frame allows for new methods to be set by setting methods directly on the remote object.

```js
import { PluginFrame } from 'plugin-frame';

let code = `application.onEvent = (message: any) => {
    console.log(message);
}`

const pluginFrame = new PluginFrame({});
pluginFrame.ready().then(async () => {
    await pluginFrame.executeCode(code);
    await pluginFrame.remote.onEvent("message");
  );
});
```
