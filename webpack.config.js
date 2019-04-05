const path = require('path');
const webpack = require('webpack');
const rxPaths = require('rxjs/_esm5/path-mapping');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = [
  {
    entry: './src/index.js',
    mode: 'development',
    output: {
      path: path.resolve(__dirname),
      filename: 'public/js/index.main.react.js'
    },
    devtool: 'none', // 'cheap-eval-source-map',
    module: {
      rules: [
        {test: /\.(js|jsx)$/, use: 'babel-loader', exclude: /node_modules/},
        {
          test: /node_modules\/vanilla-jsx\/lib\/.*\.(js|jsx)$/,
          use: 'babel-loader'
        }
      ]
    },
    plugins: [
      new BundleAnalyzerPlugin()
    ],
    optimization: {
      minimizer: [new UglifyJsPlugin({
        exclude: /src/
      })],
    },
    node: {
      fs: 'empty'
    },
    resolve: {
      // Use the "alias" key to resolve to an ESM distribution
      alias: rxPaths()
    }
  }];