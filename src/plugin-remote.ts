import { Connection } from './connection';
import { PluginInterface, RemotePluginOptions } from './model';

let application: any = {};
export class PluginRemote<T extends { [K in keyof T]: Function } = any> {
  private api: PluginInterface;
  private options: RemotePluginOptions = {};
  public connection: Connection<T> | undefined;

  constructor(api: PluginInterface, options?: RemotePluginOptions) {
    window.addEventListener('message', this.initPort.bind(this));
    this.options = Object.assign({}, options);
    if (!this.options.pluginObject) {
      this.options.pluginObject = application;
      (window as any).application = application;
    }
    this.api = api;
  }

  private async initPort(event: MessageEvent) {
    switch (event.data.type) {
      case 'init':
        let port = event.ports[0];
        this.connection = new Connection<T>(port, {
          ...this.options,
        });
        this.connection.setServiceMethods({
          runCode: this.runCode,
        });
        this.connection.setLocalMethods(this.api);
        await this.connection.callServiceMethod('connected');
        break;
    }
  }

  private runCode(code: string) {
    const scriptTag = document.createElement('script');
    scriptTag.innerHTML = code;
    document.getElementsByTagName('body')[0].appendChild(scriptTag);
  }
}
