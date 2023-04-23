const path = require('path');

module.exports = {
  rollup(config, options) {
    config.plugins.push({
      name: 'whatever',
      generateBundle(opts, bundle) {
        const entry = Object.values(bundle).find((chunk) => chunk.isEntry);
        const filename = opts.entryFileNames;
        bundle[filename].code = bundle[filename].code.replace(
          "'<TEMPLATE>'",
          JSON.stringify(entry.code)
        );
      },
    });
    return config;
  },
};
