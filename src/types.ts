export interface PluginInterface {
  [K: string]: Function;
}

export interface PreparePluginInterface {
  [K: string]: (...args: any[]) => any[];
}

export interface CompletePluginInterface {
  [K: string]: (result: any) => any;
}

export interface RemotePluginOptions {
  prepareFuncs?: PreparePluginInterface;
  completeFuncs?: CompletePluginInterface;
  pluginObject?: PluginInterface;
}

export interface HostPluginOptions {
  frameSrc?: URL;
  container?: Element;
  sandboxAttributes?: string[];
  remoteObjectName?: string;
}
