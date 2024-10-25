const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      fs: false,
      path: false,
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({}),
    }),
  ],
};