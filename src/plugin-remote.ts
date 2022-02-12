import { Connection } from './connection';
import { PluginInterface, RemotePluginOptions } from './model';

let application: any = {};
export class PluginRemote<
  T extends { [K in keyof T]: Function } = any
> extends Connection<T> {
  private remoteOptions: RemotePluginOptions = {};

  constructor(api: PluginInterface, options?: RemotePluginOptions) {
    super();
    window.addEventListener('message', this.initPort.bind(this));
    this.remoteOptions = Object.assign({}, options);
    if (!this.remoteOptions.pluginObject) {
      this.remoteOptions.pluginObject = application;
      (window as any).application = application;
    }
    this.setLocalMethods(api);
    this.setOptions(this.remoteOptions);
  }

  private async initPort(event: MessageEvent) {
    switch (event.data.type) {
      case 'init':
        const port = event.ports[0];
        this.setPort(port);
        this.setServiceMethods({
          runCode: this.runCode,
        });
        await this.callServiceMethod('connected');
        break;
    }
  }

  private runCode(code: string) {
    const scriptTag = document.createElement('script');
    scriptTag.innerHTML = code;
    document.getElementsByTagName('body')[0].appendChild(scriptTag);
  }
}
