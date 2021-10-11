import { HostPluginOptions, PluginInterface } from './model';

export class PluginHost {
  private port: MessagePort | undefined;
  private code: string;
  private iframe: HTMLIFrameElement;
  private remoteOrigin: string;
  private remoteMethods: string[] = [];
  private api: PluginInterface;
  private readyPromise: Promise<void>;
  private defaultOptions: HostPluginOptions = {
    container: document.body,
    sandboxAttributes: ['allow-scripts'],
  };
  private options: HostPluginOptions;
  public child: any = {};
  private compiled = '<TEMPLATE>';
  private resolveReady: any;
  constructor(code: string, api: PluginInterface, options?: HostPluginOptions) {
    this.code = code;
    this.api = api;
    this.options = Object.assign(this.defaultOptions, options);
    this.remoteOrigin = '*';
    if (
      this.options.sandboxAttributes?.includes('allow-same-origin') &&
      this.options.frameSrc?.origin
    ) {
      this.remoteOrigin = this.options.frameSrc?.origin;
    }
    this.iframe = this.createIframe();
    this.readyPromise = new Promise(resolve => {
      this.resolveReady = resolve;
    });
  }

  public ready() {
    return this.readyPromise;
  }

  public methodNameExists(name: string) {
    return new Promise<boolean>((res, rej) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = ({ data }) => {
        channel.port1.close();
        if (data.error) {
          rej(data.error);
        } else {
          res(data.result);
        }
      };

      this.port?.postMessage({ type: 'exists', name: name }, [channel.port2]);
    });
  }

  public destroy() {
    this.iframe.remove();
    this.port?.close();
  }

  private createIframe() {
    let iframe = document.createElement('iframe');
    iframe.frameBorder = '0';
    iframe.width = '0';
    iframe.height = '0';
    (iframe as any).sandbox = this.options.sandboxAttributes?.join(' ');
    console.log(iframe.sandbox.value);
    iframe.onload = this.iframeOnLoad.bind(this);

    if (this.options.frameSrc) {
      iframe.src = this.options.frameSrc.href;
      this.options.container?.append(iframe);
      return iframe;
    }

    const srcdoc = this.getSrcDoc();
    iframe.setAttribute('srcdoc', srcdoc);
    this.options.container?.append(iframe);
    return iframe;
  }

  private getSrcDoc() {
    let srcdoc =
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script type="module">
    <INLINE>
    const pluginRemote = new PluginRemote({});
  </scr` +
      `ipt>
</head>
<body></body>
</html>
  `;

    srcdoc = srcdoc.replace('<INLINE>', this.compiled);

    return srcdoc;
  }

  private async portOnMessage(event: MessageEvent) {
    switch (event.data.type) {
      case 'events':
        this.remoteMethods = event.data.api;
        this.createFunctions();
        this.connected();
        break;
      case 'method':
        try {
          const name = event.data.name;
          const method = this.api[name];
          const args = event.data.args;
          const result = await method.apply(null, args);
          event.ports[0].postMessage({ result: result });
        } catch (e) {
          console.log(e);
          event.ports[0].postMessage({ error: e });
        }
        break;
    }
  }

  private iframeOnLoad() {
    const channel = new MessageChannel();
    this.port = channel.port1;
    this.port.onmessage = this.portOnMessage.bind(this);

    const names = [];
    for (let name in this.api) {
      if (this.api.hasOwnProperty(name)) {
        names.push(name);
      }
    }
    this.iframe.contentWindow?.postMessage(
      { type: 'init', api: names },
      this.remoteOrigin,
      [channel.port2]
    );
    this.iframe.contentWindow?.postMessage(
      { type: 'init-eval', data: this.code },
      this.remoteOrigin
    );
  }

  private generateFunction(name: string) {
    const newFunc = (...args: any[]) =>
      new Promise((res, rej) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = ({ data }) => {
          channel.port1.close();
          if (data.error) {
            rej(data.error);
          } else {
            res(data.result);
          }
        };
        this.port?.postMessage(
          {
            type: 'method',
            name: name,
            args: args,
          },
          [channel.port2]
        );
      });
    return newFunc;
  }

  private createFunctions() {
    this.remoteMethods.forEach(name => {
      this.child[name] = this.generateFunction(name);
    });
  }

  private connected() {
    this.resolveReady(undefined);
  }
}
