import { resolve } from 'path';
import { defineConfig, Plugin } from 'vite';
import dts from 'vite-plugin-dts';

function noMinifyPlugin(): Plugin {
  return {
    name: 'no-minify-inline',
    transform(code, id) {
      if (id.endsWith('?inline')) {
        return {
          code: `export default ${JSON.stringify(code)}`,
          map: null,
        };
      }
    },
  };
}

// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'plugin-frame',
      fileName: 'plugin-frame',
      formats: ['es'],
    },
  },
  plugins: [dts(), noMinifyPlugin()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
