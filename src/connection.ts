import { RemotePluginOptions } from '.';
import { PluginInterface } from './model';

const MessageType = {
  Method: 'method',
  Exists: 'exists',
  SetMethods: 'set-methods',
  ServiceMethod: 'service-method',
} as const;
export type MessageType = typeof MessageType[keyof typeof MessageType];

export class Connection {
  private port: MessagePort;
  public remote: PluginInterface = {};
  private api: PluginInterface = {};
  private options: RemotePluginOptions = {};
  private serviceMethods: PluginInterface = {};
  constructor(port: MessagePort, options?: RemotePluginOptions) {
    this.port = port;
    this.options = Object.assign({}, options);
    this.port.onmessage = this.portOnMessage;
    this.remote = new Proxy(this.remote, {
      get: (_target, prop: any) => {
        return this.generateFunction(prop);
      },
      set: (_target, prop: any, value) => {
        this.api[prop] = value;
        return true;
      },
    });
    if (this.options.pluginObject) {
      Object.setPrototypeOf(this.options.pluginObject, this.remote);
    }
  }

  public setServiceMethods(api: PluginInterface) {
    this.serviceMethods = api;
  }

  public setLocalMethods(api: PluginInterface) {
    let names = Object.keys(api);
    this.port.postMessage({ type: MessageType.SetMethods, api: names });
    this.api = api;
  }

  public callServiceMethod(methodName: string, ...args: any[]) {
    return new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = (event: MessageEvent) => {
        const data = event.data;
        port1.close();
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.response);
        }
      };
      this.port.postMessage(
        { type: MessageType.ServiceMethod, name: methodName, args: args },
        [port2]
      );
    });
  }

  public close() {
    this.port.close();
  }

  private portOnMessage = async (event: MessageEvent) => {
    switch (event.data.type) {
      case MessageType.Method:
        try {
          const name = event.data.name;
          const method = this.api[name];
          const args = event.data.args;
          const result = await method.apply(null, args);
          event.ports[0].postMessage({ result: result });
        } catch (e) {
          event.ports[0].postMessage({ error: this.serializeError(e) });
        }
        break;
      case MessageType.Exists:
        try {
          const exists = !!this.remote[event.data.name];
          event.ports[0].postMessage({ result: exists });
        } catch (e) {
          event.ports[0].postMessage({ error: this.serializeError(e) });
        }
        break;
      case MessageType.SetMethods:
        const methodNames = event.data.api;
        console.log(methodNames);
        break;
      case MessageType.ServiceMethod:
        try {
          const name = event.data.name;
          const method = this.serviceMethods[name];
          const args = event.data.args;
          const result = await method.apply(null, args);
          event.ports[0].postMessage({ result: result });
        } catch (e) {
          event.ports[0].postMessage({ error: this.serializeError(e) });
        }
        break;
    }
  };

  private serializeError(error: any) {
    console.log(error);
    return [...Object.keys(error), 'message'].reduce(
      (acc: Record<string, any>, it) => {
        acc[it] = error[it];
        return acc;
      },
      {}
    );
  }

  private generateFunction(name: string) {
    const newFunc = (...args: any[]) =>
      new Promise((resolve, reject) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = ({ data }) => {
          port1.close();
          if (data.error) {
            reject(data.error);
          } else {
            let result = data.result;
            if (
              this.options.completeFuncs &&
              this.options.completeFuncs[name]
            ) {
              result = this.options.completeFuncs[name](result);
            }
            resolve(result);
          }
        };
        if (this.options.prepareFuncs && this.options.prepareFuncs[name]) {
          args = this.options.prepareFuncs[name](args);
        }
        this.port.postMessage(
          {
            type: MessageType.Method,
            name: name,
            args: args,
          },
          [port2]
        );
      });
    return newFunc;
  }
}
