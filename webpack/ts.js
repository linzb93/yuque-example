const webpack = require('webpack');
const path = require('path');
const { Module } = require('module');
const buildIns = Module.builtinModules
.filter(m => !m.includes('/') && !m.startsWith('_'))
.reduce((obj, item) => {
    return {
        ...obj,
        [item]: `commonjs ${item}`
    }
}, {});

webpack({
    entry: './main',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'dest.js',
    },
    externals: buildIns,
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader'
            }
        ]
    }
}, err => {
    if (err) {
        console.log(err.message);
    }
})