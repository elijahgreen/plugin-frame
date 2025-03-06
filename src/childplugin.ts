/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChildPluginOptions,
  PluginInterface,
  PreparePluginInterface,
  CompletePluginInterface,
} from './types';

type MessageType = 'method' | 'method-defined' | 'service-method';

type Message = {
  type: MessageType;
  name: string;
  args?: any[];
};

export class Connection<
  T extends { [K in keyof T]: (...args: any[]) => any } = any,
> {
  public remote: T;
  public hasDefined: { [K in keyof T]: () => Promise<boolean> };
  private port: MessagePort | undefined;
  private api: PluginInterface = {};
  private options: ChildPluginOptions = {};
  private serviceMethods: PluginInterface = {};
  constructor() {
    this.remote = new Proxy<T>({} as any, {
      get: (_target, prop: any) => {
        if (prop === 'then') return null;

        return this.generateFunction(prop);
      },
      set: (_target, prop: any, value) => {
        this.api[prop] = value;
        return true;
      },
    });
    this.hasDefined = new Proxy<{ [K in keyof T]: () => Promise<boolean> }>(
      {} as any,
      {
        get: (_target, prop: any) => {
          return () => this.methodDefined(prop);
        },
      }
    );
  }

  /**
   * Set method that can be called by remote iframe
   * @param api - object containing method callable by remote iframe
   */
  public setLocalMethods(api: PluginInterface) {
    this.api = api;
  }

  /**
   * Set methods that will modify arguments before sending them to remote method
   * @param prepareMethods - object containing methods
   */
  public setPrepareMethods(prepareMethods: PreparePluginInterface) {
    this.options.prepareMethods = prepareMethods;
  }

  /**
   * Set methods that will modify response after receiving it from remote method
   * @param completeMethods - object containing methods
   */
  public setCompleteMethods(completeMethods: CompletePluginInterface) {
    this.options.completeMethods = completeMethods;
  }

  /**
   * Checks whether or not remote method is undefined
   * @param methodName - name of method on remote
   * @returns false if method is undefined, otherwise true
   */
  public methodDefined(methodName: string): Promise<boolean> {
    const message: Message = { type: 'method-defined', name: methodName };
    return this.sendMessage(message);
  }

  protected setServiceMethods(api: PluginInterface) {
    this.serviceMethods = api;
  }

  protected callServiceMethod(methodName: string, ...args: any[]) {
    const message: Message = {
      type: 'service-method',
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

  protected setOptions(options?: ChildPluginOptions) {
    this.options = Object.assign({}, options);
    if (this.options.pluginObject) {
      Object.setPrototypeOf(this.options.pluginObject, this.remote);
    }
  }

  private sendMessage<U>(message: Message): Promise<U> {
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
      case 'method':
        try {
          const name = event.data.name;
          const method = this.api[name];
          const args = event.data.args;
          const result = await method(...args);
          event.ports[0].postMessage({ result: result });
        } catch (e) {
          this.sendError(event.ports[0], e);
        }
        break;
      case 'method-defined':
        try {
          const exists = !!this.api[event.data.name];
          event.ports[0].postMessage({ result: exists });
        } catch (e) {
          this.sendError(event.ports[0], e);
        }
        break;
      case 'service-method':
        try {
          const name = event.data.name;
          const method = this.serviceMethods[name];
          const args = event.data.args;
          const result = await method(...args);
          event.ports[0].postMessage({ result: result });
        } catch (e) {
          this.sendError(event.ports[0], e);
        }
        break;
    }
  };

  private sendError(port: MessagePort, error: any) {
    const serializedError = this.serializeError(error);
    try {
      port.postMessage({ error: this.serializeError(serializedError) });
    } catch (e) {
      console.log('Could not send error: ', e);
      if (e instanceof DOMException) {
        const stringError = JSON.parse(JSON.stringify(serializedError));
        port.postMessage({ error: stringError });
      }
    }
  }

  private serializeError(error: any) {
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
              this.options.completeMethods &&
              this.options.completeMethods[name]
            ) {
              result = this.options.completeMethods[name](result);
            }
            resolve(result);
          }
        };
        if (this.options.prepareMethods && this.options.prepareMethods[name]) {
          args = this.options.prepareMethods[name].apply(null, args);
        }
        this.port?.postMessage(
          {
            type: 'method',
            name: name,
            args: args,
          },
          [port2]
        );
      });
    return newFunc;
  }
}

const application: any = {};
export default class ChildPlugin<
  T extends { [K in keyof T]: (...args: any[]) => any } = any,
> extends Connection<T> {
  private remoteOptions: ChildPluginOptions = {};

  constructor(api: PluginInterface, options?: ChildPluginOptions) {
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
      case 'init': {
        const port = event.ports[0];
        this.setPort(port);
        this.setServiceMethods({
          runCode: this.runCode,
        });
        await this.callServiceMethod('connected');
        break;
      }
    }
  }

  private runCode(code: string) {
    const scriptTag = document.createElement('script');
    scriptTag.innerHTML = code;
    document.getElementsByTagName('head')[0].appendChild(scriptTag);
  }
}
