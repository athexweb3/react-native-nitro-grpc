import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  eslintConfigPrettier,
  {
    files: ['**/*.js', '**/*.config.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off',
    },
  },
  {
    ignores: ['**/node_modules/**', 'android/**', 'ios/**'],
  },
];
