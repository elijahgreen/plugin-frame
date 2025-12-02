import { resolve } from 'path';
import { defineConfig, Plugin } from 'vite';
import { transform } from 'esbuild';
import dts from 'vite-plugin-dts';

function minifyInlinePlugin(): Plugin {
  return {
    name: 'minify-inline',
    async transform(code, id) {
      if (id.endsWith('?inline')) {
        const result = await transform(code, {
          minify: true,
          target: 'es2020',
          format: 'iife',
          globalName: 'ChildPluginModule',
          legalComments: 'none',
        });
        // Wrap the IIFE output to expose ChildPlugin as a global
        const wrappedCode =
          result.code + '\nvar ChildPlugin = ChildPluginModule.default;';
        return {
          code: `export default ${JSON.stringify(wrappedCode)}`,
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
      entry: {
        'plugin-frame': resolve(__dirname, 'src/index.ts'),
        host: resolve(__dirname, 'src/host.ts'),
        child: resolve(__dirname, 'src/child.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  plugins: [dts(), minifyInlinePlugin()],
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
