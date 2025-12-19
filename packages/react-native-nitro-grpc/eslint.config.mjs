import js from '@eslint/js';
import typescriptEslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

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
    }
  },
  {
    ignores: [
      '**/node_modules/**',
      'lib/**',
      'android/**',
      'ios/**',
      'cpp/**',
      'nitrogen/**',
      '!src/types/credentials.ts',
      '!src/specs/GrpcClient.nitro.ts',
    ],
  },
];
