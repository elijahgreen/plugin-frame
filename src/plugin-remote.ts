import { Connection } from './connection';
import { PluginInterface, RemotePluginOptions } from './model';

let application: any = {};
export class PluginRemote {
  private port: MessagePort | undefined;
  private api: PluginInterface;
  private options: RemotePluginOptions = {};
  public connection: Connection | undefined;

  constructor(api: PluginInterface, options?: RemotePluginOptions) {
    window.addEventListener('message', this.initPort.bind(this));
    this.options = Object.assign({}, options);
    this.api = api;
  }

  private async initPort(event: MessageEvent) {
    switch (event.data.type) {
      case 'init':
        this.port = event.ports[0];
        this.connection = new Connection(this.port, {
          ...this.options,
          pluginObject: application,
        });
        this.connection.setServiceMethods({
          runCode: this.runCode,
        });
        console.log(this.api);
        this.connection.setLocalMethods(this.api);
        await this.connection.callServiceMethod('connected');
        break;
    }
  }

  private runCode(code: string) {
    //eval(code);
    const scriptTag = document.createElement('script');
    scriptTag.innerHTML = code;
    document.getElementsByTagName('body')[0].appendChild(scriptTag);
  }
}

(window as any).application = application;
