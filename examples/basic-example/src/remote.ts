import { ChildPlugin } from 'plugin-frame';

const apis = {
  test: (a: number) => {
    console.log('Iframe: ', a);
    return 6;
  },
};

let plugin = new ChildPlugin(apis);
