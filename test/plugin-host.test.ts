import { PluginHost } from '../src/';
window.MessageChannel = require('worker_threads').MessageChannel;

describe('PluginHost', () => {
  it('should init', () => {
    const pluginHost = new PluginHost('', {});
    expect(pluginHost).not.toBeNull();
    pluginHost.destroy();
  });
});
