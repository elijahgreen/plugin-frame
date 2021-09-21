const path = require('path');

module.exports = {
  rollup(config, options) {
    config.plugins.push({
        name: 'whatever',
        generateBundle(opts, bundle) {
            const entry = Object.values(bundle).find((chunk) => chunk.isEntry);
            const file = path.parse(opts.file).base
            bundle[file].code = bundle[file].code.replace('"<TEMPLATE>"', JSON.stringify(entry.code));
        }
    });
    return config;
  },
};