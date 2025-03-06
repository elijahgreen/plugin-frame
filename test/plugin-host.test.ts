import { PluginFrame, PluginFrameOptions } from "../src"
import { describe, expect, afterEach, it, vi } from 'vitest'
describe('PluginFrame', () => {
  afterEach(() => {
    let frames = document.querySelectorAll('iframe');
    frames.forEach((frame) => {
      frame.remove();
    });
  });

  it('should create iframe', () => {
    new PluginFrame({});
    const element = document.querySelectorAll('iframe')[0];
    expect(element).not.toBeNull();
  });

  it('should add only "allow-scripts" sandbox attribute by default', () => {
    new PluginFrame({});
    let element = document.querySelectorAll('iframe')[0];
    expect(element.sandbox.value).toEqual('allow-scripts');
  });

  it('should set custom sandbox attributes', () => {
    const plugin = new PluginFrame(
      {},
      { sandboxAttributes: ['allow-scripts', 'allow-popups'] }
    );
    return plugin.ready().then(() => {
      let element = document.querySelectorAll('iframe')[0];
      expect(element.sandbox.value).toContain('allow-popups');
    });
  });

  it('should set custom allow attribute', () => {
    new PluginFrame({}, { allow: 'autoplay' });
    let element = document.querySelectorAll('iframe')[0];
    expect(element.allow).toEqual('autoplay');
  });

  it('should call local api', () => {
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame(api);
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
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame(api, { remoteObjectName: 'frame' });
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
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame<{
      dynamicMethod: (num: number) => Promise<number>;
    }>(api);
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`pluginFrame.setLocalMethods({
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
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };

    const plugin = new PluginFrame<{
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

  it('should detect if remote has an undefined method using methodDefined', () => {
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame(api);
    return plugin
      .ready()
      .then(() => plugin.methodDefined('dynamicMethod'))
      .then((exists) => {
        expect(exists).toBe(false);
      });
  });

  it('should detect if remote has an undefined using hasDefined', () => {
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame(api);
    return plugin
      .ready()
      .then(() => plugin.hasDefined.dynamicMethod())
      .then((exists) => {
        expect(exists).toBe(false);
      });
  });

  it('should call remote api that is dynamically added to undefined method using methodDefined', () => {
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame(api);
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

  it('should call remote api that is dynamically added to undefined method using hasDefined', () => {
    const calledMethod = vi.fn().mockImplementation((a) => a + 2);
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame(api);
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`
          application.dynamicMethod = function(num) {
            return application.methodCall(num);
          }
        `);
      })
      .then(() => plugin.hasDefined.dynamicMethod())
      .then((exists) => {
        expect(exists).toBe(true);
      });
  });

  it('should modify args with prepare method', () => {
    const calledMethod = vi
      .fn()
      .mockImplementation((headers: string[][]) =>
        headers.map((e) => typeof e)
      );
    const api = {
      methodCall: calledMethod,
    };
    const plugin = new PluginFrame(api);
    return plugin
      .ready()
      .then(() => {
        // Headers is not serializable
        return plugin.executeCode(`
        pluginFrame.setLocalMethods({
          dynamicMethod: function() {
            return application.methodCall(new Headers({'key': 'value'}));
          }
        });
        pluginFrame.setPrepareMethods({
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

  it('should modify return value with complete method', () => {
    const options: PluginFrameOptions = {
      completeMethods: {
        dynamicMethod: (result) => {
          result.success = true;
          return result;
        },
      },
    };
    const plugin = new PluginFrame({}, options);
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`
        pluginFrame.setLocalMethods({
          dynamicMethod: function() {
            return { test: "test" };
          }
        });
        `);
      })
      .then(() => plugin.remote.dynamicMethod())
      .then((result) => {
        expect(result.success).toBe(true);
      });
  });

  it('should respond to errors', () => {
    const plugin = new PluginFrame({});
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`
        pluginFrame.setLocalMethods({
          dynamicMethod: async function() {
            throw new Error("Error");
          }
        });
        `);
      })
      .then(() => plugin.remote.dynamicMethod())
      .catch((error: Error) => {
        expect(error.message).toBe('Error');
      });
  });

  it('should respond to errors', () => {
    const plugin = new PluginFrame({});
    return plugin
      .ready()
      .then(() => {
        return plugin.executeCode(`
        pluginFrame.setLocalMethods({
          dynamicMethod: async function() {
            throw new Error("Error");
          }
        });
        `);
      })
      .then(() => plugin.remote.dynamicMethod())
      .catch((error: Error) => {
        expect(error.message).toBe('Error');
      });
  });
});
