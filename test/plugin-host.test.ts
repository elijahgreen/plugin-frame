import { PluginHost } from '../dist/index';

describe('PluginHost', () => {
  afterEach(() => {
    let frames = document.querySelectorAll('iframe');
    frames.forEach(frame => {
      frame.remove();
    });
  });

  it('should init', () => {
    let pluginHost = new PluginHost('', {});
    expect(pluginHost).not.toBeNull();
  });

  it('should create iframe', () => {
    new PluginHost('', {});
    const element = document.querySelectorAll('iframe')[0];
    expect(element).not.toBeNull();
  });

  it('should add only "allow-scripts" sandbox attribute by default', () => {
    new PluginHost('', {});
    let element = document.querySelectorAll('iframe')[0];
    expect(element.sandbox.value).toEqual('allow-scripts');
  });

  it('should set custom sandbox attributes', () => {
    const plugin = new PluginHost(
      '',
      {},
      { sandboxAttributes: ['allow-scripts', 'allow-popups'] }
    );
    return plugin.ready().then(() => {
      let element = document.querySelectorAll('iframe')[0];
      expect(element.sandbox.value).toContain('allow-popups');
    });
  });
});
