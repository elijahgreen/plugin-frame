import { PluginFrame } from '../src';
import { describe, expect, afterEach, it, vi } from 'vitest';

// The child document is served by the vitest browser mode dev server, so it is
// same-origin with the test page. `allow-same-origin` is therefore what makes
// PluginFrame narrow its postMessage target from '*' to the frame's origin —
// if that origin were wrong, `init` would never reach the child and `ready()`
// would never resolve.
const frameSrc = () =>
  new URL('/test/fixtures/child-frame.html', location.href);

interface ChildInterface {
  childMethod: (num: number) => Promise<number>;
  childCallsHost: (num: number) => Promise<number>;
}

describe('PluginFrame with frameSrc', () => {
  afterEach(() => {
    const frames = document.querySelectorAll('iframe');
    frames.forEach((frame) => {
      frame.remove();
    });
  });

  it('should load the child document and become ready', () => {
    const plugin = new PluginFrame(
      {},
      {
        frameSrc: frameSrc(),
        sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
      }
    );
    return plugin.ready().then(() => {
      const element = document.querySelectorAll('iframe')[0];
      expect(element.src).toEqual(frameSrc().href);
      expect(element.getAttribute('srcdoc')).toBeNull();
    });
  });

  it('should call a method defined by the child document', () => {
    const plugin = new PluginFrame<ChildInterface>(
      {},
      {
        frameSrc: frameSrc(),
        sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
      }
    );
    return plugin
      .ready()
      .then(() => plugin.remote.childMethod(21))
      .then((result) => {
        expect(result).toBe(42);
      });
  });

  it('should let the child document call back into the host api', () => {
    const hostMethod = vi.fn().mockImplementation((num: number) => num + 1);
    const plugin = new PluginFrame<ChildInterface>(
      { hostMethod },
      {
        frameSrc: frameSrc(),
        sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
      }
    );
    return plugin
      .ready()
      .then(() => plugin.remote.childCallsHost(5))
      .then((result) => {
        expect(hostMethod).toHaveBeenCalledWith(5);
        expect(result).toBe(6);
      });
  });

  it('should execute code inside the child document', () => {
    const hostMethod = vi.fn().mockImplementation((num: number) => num + 1);
    const plugin = new PluginFrame(
      { hostMethod },
      {
        frameSrc: frameSrc(),
        sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
      }
    );
    return plugin
      .ready()
      .then(() => plugin.executeCode('application.hostMethod(7)'))
      .then(() => vi.waitFor(() => expect(hostMethod).toHaveBeenCalledWith(7)));
  });

  it('should report whether the child document defines a method', () => {
    const plugin = new PluginFrame<ChildInterface>(
      {},
      {
        frameSrc: frameSrc(),
        sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
      }
    );
    return plugin
      .ready()
      .then(() =>
        Promise.all([
          plugin.hasDefined.childMethod(),
          plugin.methodDefined('notDefined'),
        ])
      )
      .then(([defined, missing]) => {
        expect(defined).toBe(true);
        expect(missing).toBe(false);
      });
  });
});
