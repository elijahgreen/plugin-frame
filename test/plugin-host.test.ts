import { PluginHost } from '../dist/index';

describe('PluginHost', () => {
  afterEach(() => {
    let frames = document.querySelectorAll('iframe');
    frames.forEach((frame) => {
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
    const calledMethod = jest.fn().mockImplementation((a) => a + 2);
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

  it('should call local api with user supplied remote object name', () => {
    const calledMethod = jest.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginHost(api, { remoteObjectName: 'frame' });
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode('frame.methodCall(1)');
      })
      .then(() => {
        expect(calledMethod.mock.calls.length).toBe(1);
      });
  });

  it('should call remote api after setting methods', () => {
    const calledMethod = jest.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginHost<{
      dynamicMethod: (num: number) => Promise<number>;
    }>(api);
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`pluginRemote.setLocalMethods({
          dynamicMethod: function(num) {
            return application.methodCall(num);
          }
        });`);
      })
      .then(() => plugin.remote.dynamicMethod(5))
      .then(() => {
        expect(calledMethod.mock.calls.length).toBe(1);
      });
  });

  it('should call remote api that is dynamically added to undefined method', () => {
    const calledMethod = jest.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };

    const plugin = new PluginHost<{
      dynamicMethod: (num: number) => Promise<number>;
    }>(api);
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`
          application.dynamicMethod = function(num) {
            return application.methodCall(num);
          }
        `);
      })
      .then(() => plugin.remote.dynamicMethod(5))
      .then(() => {
        expect(calledMethod.mock.calls.length).toBe(1);
      });
  });

  it('should detect if remote has an undefined method', () => {
    const calledMethod = jest.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginHost(api);
    return plugin
      .ready()
      .then(() => plugin.methodDefined('dynamicMethod'))
      .then((exists) => {
        expect(exists).toBe(false);
      });
  });

  it('should call remote api that is dynamically added to undefined method', () => {
    const calledMethod = jest.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginHost(api);
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`
          application.dynamicMethod = function(num) {
            return application.methodCall(num);
          }
        `);
      })
      .then(() => plugin.methodDefined('dynamicMethod'))
      .then((exists) => {
        expect(exists).toBe(true);
      });
  });

  it('should modify args with prepare method', () => {
    const calledMethod = jest
      .fn()
      .mockImplementation((headers: string[][]) =>
        headers.map((e) => typeof e)
      );
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginHost(api);
    return plugin
      .ready()
      .then(() => {
        // Headers is not serializable
        return plugin.executeCode(`
        pluginRemote.setLocalMethods({
          dynamicMethod: function() {
            return application.methodCall(new Headers({'key': 'value'}));
          }
        });
        pluginRemote.setPrepareMethods({
          methodCall: (headers) => {
            let arr = Object.entries(headers);
            return [arr];
          }
        });
        `);
      })
      .then(() => plugin.remote.dynamicMethod())
      .then(() => {
        expect(calledMethod.mock.calls.length).toBe(1);
      });
  });
});
