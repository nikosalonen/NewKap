const path = require('path');

module.exports = (nextConfig) => {
  return Object.assign({}, nextConfig, {
    webpack(config, options) {
      config.module.rules.push({
        test: /\.+(js|jsx|mjs|ts|tsx)$/,
        loader: options.defaultLoaders.babel,
        include: [
          path.join(__dirname, '..', 'main', 'common'),
          path.join(__dirname, '..', 'main', 'remote-states', 'use-remote-state.ts')
        ]
      });

      // Next 10 bundles with webpack 4, which cannot load the ES module builds of
      // linkify-react and linkifyjs (they import named exports from CommonJS React).
      // Point webpack at their CommonJS builds instead.
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          'linkify-react$': require.resolve('linkify-react'),
          linkifyjs$: require.resolve('linkifyjs')
        }
      };

      if (!options.isServer) {
        config.target = 'web';
      }
      config.devtool = 'cheap-module-source-map';

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    }
  })
}
