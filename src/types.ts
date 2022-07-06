export interface PluginInterface {
  [K: string]: Function;
}

export interface PreparePluginInterface {
  [K: string]: (...args: any[]) => any[];
}

export interface CompletePluginInterface {
  [K: string]: (result: any) => any;
}

export interface ConnectionOptions {
  prepareMethods?: PreparePluginInterface;
  completeMethods?: CompletePluginInterface;
}

export interface ChildPluginOptions extends ConnectionOptions {
  /** Object where the remote methods are called from, by default is set to `window.application` */
  pluginObject?: PluginInterface;
}

export interface PluginFrameOptions extends ConnectionOptions {
  frameSrc?: URL;
  /** DOM object where the iframe will be appended */
  container?: Element;
  /** Sandbox attributes to add to the iframe, by default it is set to allow-scripts */
  sandboxAttributes?: string[];
  /** Name of remote object, by default set to `application` (Only works when frameSrc is set to undefined) */
  remoteObjectName?: string;
  /** Class of the iframe */
  frameClass?: string;
  /** Iframe allow attribute */
  allow?: string;
}
