import React from 'react';
import logo from './logo.svg';
import './App.css';
import { PluginHost, PluginInterface, HostPluginOptions } from 'plugin-frame';

interface NetworkRequestInterface {
  body: Blob;
  headers: { [k: string]: string };
  status: number;
  statusText: string;
  url: string;
}

const App: React.FC = () => {
  const [pluginHost, setPluginHost] = React.useState<PluginHost>();
  const [pluginConnected, setPluginConnected] = React.useState(false);
  const pluginref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const apis: PluginInterface = {
      test: (a: number) => {
        console.log("Let's go host: ", a);
        return 5;
      },
      async networkRequest(input: RequestInfo, init: RequestInit) {
        const response = await fetch(input, init);
        const body = await response.blob();
        const responseHeaders = Object.fromEntries(response.headers.entries());
        const result: NetworkRequestInterface = {
          body: body,
          headers: responseHeaders,
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        };
        return result;
      },
    };
    // eslint-disable-next-line no-restricted-globals
    const code = 'application.test(10)';

    if (pluginref.current) {
      const options: HostPluginOptions = {
        container: pluginref.current,
      };
      const host = new PluginHost(code, apis, options);
      setPluginHost(host);
      host.ready(() => {
        setPluginConnected(true);
      });
    }
  }, [pluginref]);

  React.useEffect(() => {
    const callPlugin = async () => {
      if (pluginHost && pluginConnected) {
        if (await pluginHost?.methodNameExists('test')) {
          pluginHost.child.test(20);
        }
      }
    };
    callPlugin();
  }, [pluginHost, pluginConnected]);
  return (
    <div className="App">
      <div ref={pluginref}></div>
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
};

export default App;
