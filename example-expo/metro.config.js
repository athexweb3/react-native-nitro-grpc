// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packagesDir = path.join(root, 'packages');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.watchFolders = [root];
config.resolver.nodeModulesPaths = [
    path.join(__dirname, 'node_modules'),
    path.join(root, 'node_modules'),
    packagesDir,
];
config.resolver.extraNodeModules = {
    stream: require.resolve('readable-stream'),
};

module.exports = config;
