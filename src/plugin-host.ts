import { Connection } from './connection';
import { HostPluginOptions, PluginInterface } from './model';

export class PluginHost {
  private iframe: HTMLIFrameElement;
  private remoteOrigin: string;
  private api: PluginInterface;
  private readyPromise: Promise<void>;
  private defaultOptions: HostPluginOptions = {
    container: document.body,
    sandboxAttributes: ['allow-scripts'],
  };
  private options: HostPluginOptions;
  private compiled = '<TEMPLATE>';
  private resolveReady: any;
  public connection: Connection | undefined;
  constructor(api: PluginInterface, options?: HostPluginOptions) {
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
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  public ready() {
    return this.readyPromise;
  }

  public executeCode(code: string) {
    return this.connection?.callServiceMethod('runCode', code);
  }

  public destroy() {
    this.iframe.remove();
    this.connection?.close();
  }

  private createIframe() {
    let iframe = document.createElement('iframe');
    iframe.frameBorder = '0';
    iframe.width = '0';
    iframe.height = '0';
    (iframe as any).sandbox = this.options.sandboxAttributes?.join(' ');
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
    // var exports = {}
    // is used to fix electron tests
    // script close tag must be seperated in
    // order to avoid parser error
    let srcdoc =
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script>var exports = {};</scr` +
      `ipt>
  <script type="module">
    <INLINE>
    const pluginRemote = new PluginRemote({});
    window.pluginRemote = pluginRemote;
  </scr` +
      `ipt>
</head>
<body></body>
</html>
  `;

    srcdoc = srcdoc.replace('<INLINE>', this.compiled);

    return srcdoc;
  }

  private iframeOnLoad() {
    const channel = new MessageChannel();
    this.iframe.contentWindow?.postMessage(
      { type: 'init' },
      this.remoteOrigin,
      [channel.port2]
    );
    this.connection = new Connection(channel.port1);
    this.connection.setServiceMethods({
      connected: this.connected.bind(this),
    });
  }

  private connected() {
    this.connection?.setLocalMethods(this.api);
    this.resolveReady(undefined);
  }
}
