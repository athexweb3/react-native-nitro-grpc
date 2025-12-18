const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const path = require('path');
const root = path.resolve(__dirname, '..');
const packagesDir = path.join(root, 'packages');

config.watchFolders = [root];

config.resolver.nodeModulesPaths = [
  path.join(__dirname, 'node_modules'),
  path.join(root, 'node_modules'),
  packagesDir,
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('readable-stream'),
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
