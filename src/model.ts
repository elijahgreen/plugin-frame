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
}

export interface HostPluginOptions {
  useCompiled?: boolean;
  container?: Element;
}