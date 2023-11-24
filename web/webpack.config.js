const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ScriptExtHtmlWebpackPlugin = require("script-ext-html-webpack-plugin");
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const OfflinePlugin = require('offline-plugin');

const webRoot = function (env) {
  if (env === 'production') {
    return 'https://hot-bots.mixinbots.com';
  } else {
    return 'http://bots.mixin.local';
  }
};

module.exports = {
  entry: {
    app: './src/app.js'
  },

  output: {
    publicPath: '/assets/',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]-[contenthash:8].js'
  },

  resolve: {
    alias: {
      jquery: "jquery/dist/jquery",
      handlebars: "handlebars/dist/handlebars.runtime"
    }
  },

  module: {
    rules: [
      {
        test: /\.html$/, 
        use: ["handlebars-loader?helperDirs[]=" + __dirname + "/src/helpers"]
      }, {
        test: /\.(sa|sc|c)ss$/,
        use:  [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: true
            },
          }, 
          'css-loader', 
          'sass-loader'
        ]
      }, {
        test: /\.(woff|woff2|eot|ttf|otf|svg|png|jpg|gif|webp)$/,
        type: 'asset/resource',
      }]
  },

  plugins: [
    new webpack.DefinePlugin({
      PRODUCTION: (process.env.NODE_ENV === 'production'),
      WEB_ROOT: JSON.stringify(webRoot(process.env.NODE_ENV)),
      APP_NAME: JSON.stringify("Simple Bots")
    }),
    new HtmlWebpackPlugin({
      template: './src/layout.html'
    }),
    new FaviconsWebpackPlugin({
      logo: './src/launcher.png',
      prefix: 'icons/',
      background: '#FFFFFF'
    }),
    new ScriptExtHtmlWebpackPlugin({
      defaultAttribute: 'async'
    }),
    new MiniCssExtractPlugin({
      filename: '[name]-[hash].css',
      chunkFilename: '[id]-[hash].css'
    }),
    // new OfflinePlugin()
  ]
};
