module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  ignorePatterns: ['dist/', 'node_modules/'],
  env: {
    node: true,
  },
  rules: {
    'prettier/prettier': 'warn',
    'react-native/no-inline-styles': 'off',
    'react-native/no-color-literals': 'off',
  },
};
