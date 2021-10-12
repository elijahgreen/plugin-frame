import {
  CompletePluginInterface,
  PluginInterface,
  RemotePluginOptions,
  PreparePluginInterface,
} from './model';

let application: any = {};
export class PluginRemote {
  private port: MessagePort | undefined;
  private hostMethods: string[] = [];
  private api: PluginInterface;
  private prepareFuncs: PreparePluginInterface | undefined;
  private completeFuncs: CompletePluginInterface | undefined;

  constructor(api: PluginInterface, options?: RemotePluginOptions) {
    window.addEventListener('message', this.initPort.bind(this));
    this.prepareFuncs = options?.prepareFuncs;
    this.completeFuncs = options?.completeFuncs;
    this.api = api;
  }

  private async onMessage(event: MessageEvent) {
    switch (event.data.type) {
      case 'method':
        try {
          const name = event.data.name;
          const method = this.api[name];
          const args = event.data.args;
          const result = await method.apply(null, args);
          event.ports[0].postMessage({ result: result });
        } catch (e) {
          event.ports[0].postMessage({ error: e });
        }
        break;
      case 'exists':
        try {
          const exists = !!application[event.data.name];
          event.ports[0].postMessage({ result: exists });
        } catch (e) {
          event.ports[0].postMessage({ error: e });
        }
        break;
      case 'runcode':
        try {
          eval(event.data.code);
          event.ports[0].postMessage({ result: 'success' });
        } catch (e) {
          event.ports[0].postMessage({ type: 'runcode-response', error: e });
        }
        break;
    }
  }

  private initializeApi() {
    const names = [];
    for (let name in this.api) {
      if (this.api.hasOwnProperty(name)) {
        names.push(name);
      }
    }
    this.port?.postMessage({ type: 'events', api: names });
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
            let result = data.result;
            if (this.completeFuncs && this.completeFuncs[name]) {
              result = this.completeFuncs[name](result);
            }
            res(result);
          }
        };
        if (this.prepareFuncs && this.prepareFuncs[name]) {
          args = this.prepareFuncs[name](args);
        }
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
    this.hostMethods.forEach(name => {
      application[name] = this.generateFunction(name);
    });
  }

  private initPort(event: MessageEvent) {
    switch (event.data.type) {
      case 'init':
        this.port = event.ports[0];
        this.port.onmessage = this.onMessage.bind(this);
        this.hostMethods = event.data.api;
        this.initializeApi();
        this.createFunctions();
        break;
    }
  }
}
