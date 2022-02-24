import { RemotePluginOptions, PluginInterface } from './types';

const MessageType = {
  Method: 'method',
  MethodDefined: 'method-defined',
  ServiceMethod: 'service-method',
} as const;
export type MessageType = typeof MessageType[keyof typeof MessageType];

export class Connection<T extends { [K in keyof T]: Function } = any> {
  public remote: T;
  private port: MessagePort | undefined;
  private api: PluginInterface = {};
  private options: RemotePluginOptions = {};
  private serviceMethods: PluginInterface = {};
  constructor() {
    this.remote = new Proxy<T>({} as any, {
      get: (_target, prop: any) => {
        return this.generateFunction(prop);
      },
      set: (_target, prop: any, value) => {
        this.api[prop] = value;
        return true;
      },
    });
  }

  /**
   * Set method that can be called by remote iframe
   * @param api - object containing method callable by remote iframe
   */
  public setLocalMethods(api: PluginInterface) {
    this.api = api;
  }

  /**
   * Checks whether or not remote method is undefined
   * @param methodName - name of method on remote
   * @returns false if method is undefined, otherwise true
   */
  public methodDefined(methodName: string): Promise<boolean> {
    const message = { type: MessageType.MethodDefined, name: methodName };
    return this.sendMessage(message);
  }

  protected setServiceMethods(api: PluginInterface) {
    this.serviceMethods = api;
  }

  protected callServiceMethod(methodName: string, ...args: any[]) {
    const message = {
      type: MessageType.ServiceMethod,
      name: methodName,
      args: args,
    };
    return this.sendMessage<void>(message);
  }

  protected close() {
    this.port?.close();
  }

  protected setPort(port: MessagePort) {
    this.port = port;
    this.port.onmessage = this.portOnMessage;
  }

  protected setOptions(options?: RemotePluginOptions) {
    this.options = Object.assign({}, options);
    if (this.options.pluginObject) {
      Object.setPrototypeOf(this.options.pluginObject, this.remote);
    }
  }

  private sendMessage<U>(message: any): Promise<U> {
    return new Promise((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = (event: MessageEvent) => {
        const data = event.data;
        port1.close();
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data.result);
        }
      };
      this.port?.postMessage(message, [port2]);
    });
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
      case MessageType.MethodDefined:
        try {
          const exists = !!this.api[event.data.name];
          event.ports[0].postMessage({ result: exists });
        } catch (e) {
          event.ports[0].postMessage({ error: this.serializeError(e) });
        }
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
          args = this.options.prepareFuncs[name].apply(null, args);
        }
        this.port?.postMessage(
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
