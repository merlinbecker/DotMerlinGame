import { defineConfig } from 'eslint/config';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', 'coverage/', 'test-results/', 'playwright-report/', 'node_modules/', '.specify/', '.claude/'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Shipped code must not import devDependencies (research.md R2, R11).
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: false }],
    },
  },
  {
    files: ['tests/**', 'build/**', 'scripts/**', '*.config.{ts,js}'],
    plugins: { 'import-x': importX },
    rules: {
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
  // Architecture rules (Constitution II, III).
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'src/core must stay framework-independent.' },
            { group: ['**/adapters/**', '**/views/**', '**/app/**'], message: 'src/core must not depend on outer layers.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/views/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/adapters/**'], message: 'Views talk to adapters only through ports in src/core.' }] },
      ],
    },
  },
);
