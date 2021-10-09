import { PluginHost } from '../src/';

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

  it('should add only "allow-scripts" sandbox attribute by default', function() {
    pluginHost = new PluginHost('', {});
    let element = document.querySelectorAll('iframe')[0];
    expect(element.sandbox.value).toEqual('allow-scripts');
  });
});
