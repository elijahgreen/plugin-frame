import { HostPluginOptions, PluginInterface } from './model';

export class PluginHost {
  private port: MessagePort | undefined;
  private code: string;
  private iframe: HTMLIFrameElement;
  private remoteOrigin: string;
  private remoteMethods: string[] = [];
  private api: PluginInterface;
  private defaultOptions: HostPluginOptions = {
    container: document.body,
  };
  private options: HostPluginOptions;
  public child: any = {};
  public isReady = false;
  public readyFuncs: (() => void)[] = [];
  private compiled = '<TEMPLATE>';
  constructor(code: string, api: PluginInterface, options?: HostPluginOptions) {
    this.code = code;
    this.api = api;
    this.options = options || this.defaultOptions;
    this.remoteOrigin = this.options.frameSrc?.origin || '*';
    this.iframe = this.createIframe();
  }

  private createIframe() {
    let iframe = document.createElement('iframe');
    iframe.frameBorder = '0';
    iframe.width = '0';
    iframe.height = '0';
    (iframe as any).sandbox = 'allow-scripts allow-same-origin';
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

  public ready(readyFunc: () => void) {
    if (this.isReady) {
      readyFunc();
    } else {
      this.readyFuncs.push(readyFunc);
    }
  }

  private connected() {
    this.isReady = true;
    this.readyFuncs.forEach(f => {
      f();
    });
  }
}
