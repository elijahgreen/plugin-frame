import { PluginFrame, PluginFrameOptions } from 'plugin-frame/host';

const apis = {
  test: (a: number) => {
    console.log('Parent: ', a);
    return 5;
  },
};

const url = new URL(`${location.href}remote.html`);
const code = 'application.test(7);';

const options: PluginFrameOptions = {
  frameSrc: url,
  frameClass: 'test',
  sandboxAttributes: ['allow-scripts', 'allow-same-origin'],
};
interface RemoteInterface {
  test: (num: number) => Promise<number>;
}
const pluginFrame = new PluginFrame<RemoteInterface>(apis, options);
pluginFrame.ready().then(async () => {
  await pluginFrame.executeCode(code);
  const result = await pluginFrame.remote.test(5);
  console.log('Parent: Returned from iframe:', result);
});
