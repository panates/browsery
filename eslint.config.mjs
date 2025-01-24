import panatesEslint from '@panates/eslint-config';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'build/**/*',
      'node_modules/**/*',
      'packages/**/node_modules/**/*',
      'packages/**/tmp/**/*',
      'packages/**/build/**/*',
    ],
  },
  ...panatesEslint.configs.node,
  {
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
