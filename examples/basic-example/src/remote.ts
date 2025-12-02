import { ChildPlugin } from 'plugin-frame/child';

const apis = {
  test: (a: number) => {
    console.log('Iframe: ', a);
    return 6;
  },
};

new ChildPlugin(apis);
