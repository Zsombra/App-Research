import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/__tests__/**',
      'eslint.config.js',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      'vitest.workspace.ts',
    ],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: ['./packages/*/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
);
