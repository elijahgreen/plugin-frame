import { PluginHost } from '../src/';
window.MessageChannel = require('worker_threads').MessageChannel;

describe('PluginHost', () => {
  let pluginHost: PluginHost;
  afterEach(() => {
    pluginHost.destroy();
  });

  it('should init', () => {
    pluginHost = new PluginHost('', {});
    expect(pluginHost).not.toBeNull();
  });

  it('should create iframe', () => {
    pluginHost = new PluginHost('', {});
    const element = document.querySelectorAll('iframe')[0];
    expect(element).not.toBeNull();
  });
});
