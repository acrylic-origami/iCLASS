const path = require('path');
const webpack = require('webpack');
const rxPaths = require('rxjs/_esm5/path-mapping');

module.exports = [
  {
    entry: './src/index.js',
    mode: 'development',
    output: {
      path: path.resolve(__dirname),
      filename: 'public/js/index.main.js'
    },
    devtool: 'none',
    module: {
      rules: [
        {test: /\.(js|jsx)$/, use: 'babel-loader', exclude: /node_modules/},
        {
          test: /node_modules\/vanilla-jsx\/lib\/.*\.(js|jsx)$/,
          use: 'babel-loader'
        }
      ]
    },
    node: {
      fs: 'empty'
    },
    resolve: {
      // Use the "alias" key to resolve to an ESM distribution
      alias: rxPaths()
    }
  }];