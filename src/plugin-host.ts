import { Connection } from './connection';
import { HostPluginOptions, PluginInterface } from './types';

export class PluginHost<
  T extends { [K in keyof T]: Function } = any
> extends Connection<T> {
  private iframe: HTMLIFrameElement;
  private remoteOrigin: string;
  private readyPromise: Promise<void>;
  private defaultOptions: HostPluginOptions = {
    container: document.body,
    sandboxAttributes: ['allow-scripts'],
    remoteObjectName: 'application',
  };
  private hostOptions: HostPluginOptions;
  private compiled = '<TEMPLATE>';
  private resolveReady: any;
  constructor(api: PluginInterface, options?: HostPluginOptions) {
    super();
    this.hostOptions = Object.assign(this.defaultOptions, options);
    this.remoteOrigin = '*';
    if (
      this.hostOptions.sandboxAttributes?.includes('allow-same-origin') &&
      this.hostOptions.frameSrc?.origin
    ) {
      this.remoteOrigin = this.hostOptions.frameSrc?.origin;
    }
    this.setLocalMethods(api);
    this.iframe = this.createIframe();
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  /**
   * Promise that resolves after plugin has loaded
   * @returns Promise<void>
   */
  public ready() {
    return this.readyPromise;
  }

  /**
   * Executes code in plugin iframe
   *
   * @param code - code that runs in iframe
   * @returns Promise<void>
   */
  public executeCode(code: string) {
    return this.callServiceMethod('runCode', code);
  }

  /**
   * Removes iframe that contains plugin code
   */
  public destroy() {
    this.iframe.remove();
    this.close();
  }

  private createIframe() {
    let iframe = document.createElement('iframe');
    iframe.frameBorder = '0';
    iframe.width = '0';
    iframe.height = '0';
    (iframe as any).sandbox = this.hostOptions.sandboxAttributes?.join(' ');
    iframe.onload = this.iframeOnLoad.bind(this);

    if (this.hostOptions.frameSrc) {
      iframe.src = this.hostOptions.frameSrc.href;
      this.hostOptions.container?.append(iframe);
      return iframe;
    }

    const srcdoc = this.getSrcDoc();
    iframe.setAttribute('srcdoc', srcdoc);
    this.hostOptions.container?.append(iframe);
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
    let remoteObject = {};
    const pluginRemote = new PluginRemote({}, {pluginObject: remoteObject});
    window.pluginRemote = pluginRemote;
    window.${this.hostOptions.remoteObjectName} = remoteObject;
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
    this.setPort(channel.port1);
    this.setServiceMethods({
      connected: this.connected.bind(this),
    });
  }

  private connected() {
    this.resolveReady(undefined);
  }
}
