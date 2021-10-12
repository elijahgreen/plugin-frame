import { PluginHost } from '../dist/index';

describe('PluginHost', () => {
  afterEach(() => {
    let frames = document.querySelectorAll('iframe');
    frames.forEach(frame => {
      frame.remove();
    });
  });

  it('should create iframe', () => {
    new PluginHost({});
    const element = document.querySelectorAll('iframe')[0];
    expect(element).not.toBeNull();
  });

  it('should add only "allow-scripts" sandbox attribute by default', () => {
    new PluginHost({});
    let element = document.querySelectorAll('iframe')[0];
    expect(element.sandbox.value).toEqual('allow-scripts');
  });

  it('should set custom sandbox attributes', () => {
    const plugin = new PluginHost(
      {},
      { sandboxAttributes: ['allow-scripts', 'allow-popups'] }
    );
    return plugin.ready().then(() => {
      let element = document.querySelectorAll('iframe')[0];
      expect(element.sandbox.value).toContain('allow-popups');
    });
  });

  it('should call local api', () => {
    const calledMethod = jest.fn().mockImplementation(a => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginHost(api);
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode('application.methodCall(1)');
      })
      .then(() => {
        expect(calledMethod.mock.calls.length).toBe(1);
      });
  });
});
