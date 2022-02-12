import { PluginHost } from 'plugin-frame';
import { HostPluginOptions } from '../../../dist';

const apis = {
  test: (a: number) => {
    console.log("Let's go host: ", a);
    return 5;
  },
  async networkRequest(input: RequestInfo, init: RequestInit) {
    const response = await fetch(input, init);
    const body = await response.blob();
    const responseHeaders = Object.fromEntries(response.headers.entries());
    const result = {
      body: body,
      headers: responseHeaders,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    };
    return result;
  },
};

const url = new URL(`${location.href}remote.html`);
const code =
  "application.networkRequest('http://api.napster.com/v2.2/artists/top?apikey=YTkxZTRhNzAtODdlNy00ZjMzLTg0MWItOTc0NmZmNjU4Yzk4').then(d => {console.log(d);});";

let options: HostPluginOptions = {
  frameSrc: url,
};
interface RemoteInterface {
  test: (num: number) => Promise<number>;
}
let host = new PluginHost<RemoteInterface>(apis, options);
host.ready().then(async () => {
  await host.executeCode(code);
  const result = await host.remote.test(5);
  console.log(result);
});
