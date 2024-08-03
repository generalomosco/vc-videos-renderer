const path = require('path');
const webpack = require('webpack');
const env = require('./env.json');

module.exports = {
    performance: {
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
    optimization: {
        minimize: true
    },
    target: 'web',
    devtool: 'source-map',
    entry: [
        'regenerator-runtime/runtime',
        './src/index.js'
    ],
    resolve: {
        extensions: ['.js'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    output: {
        path: path.resolve(__dirname, './dist/vc-videos-renderer'),
        filename: 'vc-videos-renderer.js',
        libraryTarget: 'umd',
        publicPath: env.publicPath
    },
    module: {
        rules: [
            {
                exclude: [/(node_modules)(?![/|\\](bootstrap|foundation-sites))/],
                test: /\.js$/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true
                    }
                }]
            },
            {
                test: /\.(png|jpg|gif)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        limit: 100000,
                        name: '[name].[ext]',
                        outputPath: 'asset/vc-videos-renderer/images'
                    }
                }
            },
            {
                test: /\.(eot|woff|woff2|ttf|svg)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        limit: 100000,
                        name: '[name].[ext]',
                        outputPath: 'asset/vc-videos-renderer/fonts'
                    }
                }
            }
        ]
    },
    plugins: [],
    externals: {}
};