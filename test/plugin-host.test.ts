import { PluginHost } from '../src/';
window.MessageChannel = require('worker_threads').MessageChannel;

describe('PluginHost', () => {
  it('should init', () => {
    const pluginHost = new PluginHost('', {});
    expect(pluginHost).not.toBeNull();
    pluginHost.destroy();
  });

  it('should create iframe', () => {
    const pluginHost = new PluginHost('', {});
    const element = document.querySelectorAll('iframe')[0];
    expect(element).not.toBeNull();
    pluginHost.destroy();
  });
});
